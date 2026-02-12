import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createRouter,
  protectedProcedure,
  hostProcedure,
  managerProcedure,
  ownerProcedure,
} from "../trpc";
import {
  createConnectedAccount,
  createOnboardingLink,
  createDashboardLink,
  getAccountStatus,
  createPaymentIntent,
  createSetupIntent,
  refundPaymentIntent,
  chargeNoShowFee,
  listRecentCharges,
} from "../services/stripe.service";

export const paymentRouter = createRouter({
  // ─── Stripe Connect ─────────────────────────────────────────────────────

  /** Get the restaurant's Stripe connection status. */
  getStripeStatus: managerProcedure.query(async ({ ctx }) => {
    const restaurant = await ctx.prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        depositAmountCents: true,
        noShowFeeCents: true,
        depositPolicy: true,
        depositMinPartySize: true,
        currency: true,
      },
    });

    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
    }

    // If connected, check live status
    let liveStatus = null;
    if (restaurant.stripeAccountId) {
      try {
        liveStatus = await getAccountStatus(restaurant.stripeAccountId);
      } catch {
        liveStatus = { status: "error", payoutsEnabled: false, chargesEnabled: false };
      }
    }

    return {
      ...restaurant,
      liveStatus,
    };
  }),

  /** Start Stripe Connect onboarding. */
  connectStripe: ownerProcedure.mutation(async ({ ctx }) => {
    const restaurant = await ctx.prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeAccountId: true,
      },
    });

    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
    }

    // If already has an account, generate a new onboarding link
    if (restaurant.stripeAccountId) {
      const url = await createOnboardingLink(restaurant.stripeAccountId);
      return { onboardingUrl: url };
    }

    // Create new connected account
    const { accountId, onboardingUrl } = await createConnectedAccount(
      restaurant.name,
      restaurant.email ?? ctx.user.email,
    );

    await ctx.prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: ctx.restaurantId },
        data: {
          stripeAccountId: accountId,
          stripeAccountStatus: "pending",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "payment.connectStripe",
          entityType: "Restaurant",
          entityId: ctx.restaurantId,
          userId: ctx.user.id,
          restaurantId: ctx.restaurantId,
          details: { stripeAccountId: accountId },
        },
      });
    });

    return { onboardingUrl };
  }),

  /** Get Stripe dashboard link for the connected account. */
  getDashboardLink: managerProcedure.mutation(async ({ ctx }) => {
    const restaurant = await ctx.prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: { stripeAccountId: true },
    });

    if (!restaurant?.stripeAccountId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Stripe not connected",
      });
    }

    const url = await createDashboardLink(restaurant.stripeAccountId);
    return { url };
  }),

  /** Update payment settings. */
  updateSettings: managerProcedure
    .input(
      z.object({
        depositAmountCents: z.number().int().min(0).max(100000).optional(),
        noShowFeeCents: z.number().int().min(0).max(100000).optional(),
        depositPolicy: z.enum(["never", "all", "partySize", "custom"]).optional(),
        depositMinPartySize: z.number().int().min(1).max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.restaurant.update({
          where: { id: ctx.restaurantId },
          data: {
            ...(input.depositAmountCents !== undefined && {
              depositAmountCents: input.depositAmountCents,
            }),
            ...(input.noShowFeeCents !== undefined && {
              noShowFeeCents: input.noShowFeeCents,
            }),
            ...(input.depositPolicy !== undefined && {
              depositPolicy: input.depositPolicy,
            }),
            ...(input.depositMinPartySize !== undefined && {
              depositMinPartySize: input.depositMinPartySize,
            }),
          },
          select: {
            depositAmountCents: true,
            noShowFeeCents: true,
            depositPolicy: true,
            depositMinPartySize: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "payment.updateSettings",
            entityType: "Restaurant",
            entityId: ctx.restaurantId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: input,
          },
        });

        return result;
      });

      return updated;
    }),

  // ─── Deposits ────────────────────────────────────────────────────────────

  /** Get deposit details for a reservation. */
  getByReservation: protectedProcedure
    .input(z.object({ reservationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
        select: { id: true },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      return ctx.prisma.deposit.findMany({
        where: { reservationId: input.reservationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Create a deposit payment intent for a reservation. */
  createDeposit: hostProcedure
    .input(
      z.object({
        reservationId: z.string().cuid(),
        amount: z.number().int().min(50).max(100000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
        include: {
          customer: { select: { email: true } },
        },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { id: ctx.restaurantId },
        select: { stripeAccountId: true, currency: true },
      });

      if (!restaurant?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stripe not connected. Configure payments in Settings first.",
        });
      }

      const { paymentIntentId, clientSecret } = await createPaymentIntent({
        amount: input.amount,
        currency: restaurant.currency,
        stripeAccountId: restaurant.stripeAccountId,
        reservationId: input.reservationId,
        customerEmail: reservation.customer?.email ?? undefined,
      });

      const deposit = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.deposit.create({
          data: {
            amount: input.amount,
            currency: restaurant.currency,
            status: "PENDING",
            type: "deposit",
            stripePaymentIntentId: paymentIntentId,
            reservationId: input.reservationId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "payment.createDeposit",
            entityType: "Deposit",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              amount: input.amount,
              reservationId: input.reservationId,
              paymentIntentId,
            },
          },
        });

        return created;
      });

      return {
        depositId: deposit.id,
        clientSecret,
        stripeAccountId: restaurant.stripeAccountId,
      };
    }),

  /** Create a setup intent to save a card for no-show protection. */
  createSetupIntent: hostProcedure
    .input(z.object({ reservationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
        include: { customer: { select: { email: true } } },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { id: ctx.restaurantId },
        select: { stripeAccountId: true },
      });

      if (!restaurant?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stripe not connected",
        });
      }

      const { setupIntentId, clientSecret } = await createSetupIntent({
        stripeAccountId: restaurant.stripeAccountId,
        reservationId: input.reservationId,
        customerEmail: reservation.customer?.email ?? undefined,
      });

      return {
        clientSecret,
        setupIntentId,
        stripeAccountId: restaurant.stripeAccountId,
      };
    }),

  /** Refund a deposit. */
  refund: hostProcedure
    .input(z.object({ depositId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const deposit = await ctx.prisma.deposit.findFirst({
        where: { id: input.depositId },
        include: {
          reservation: {
            select: { restaurantId: true },
          },
        },
      });

      if (!deposit || deposit.reservation.restaurantId !== ctx.restaurantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });
      }

      if (deposit.status !== "CAPTURED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only captured deposits can be refunded",
        });
      }

      if (!deposit.stripePaymentIntentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe payment intent associated with this deposit",
        });
      }

      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { id: ctx.restaurantId },
        select: { stripeAccountId: true },
      });

      if (!restaurant?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stripe not connected",
        });
      }

      await refundPaymentIntent(
        deposit.stripePaymentIntentId,
        restaurant.stripeAccountId,
      );

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.deposit.update({
          where: { id: input.depositId },
          data: { status: "REFUNDED" },
        });

        await tx.auditLog.create({
          data: {
            action: "payment.refund",
            entityType: "Deposit",
            entityId: input.depositId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              amount: deposit.amount,
              paymentIntentId: deposit.stripePaymentIntentId,
            },
          },
        });

        return result;
      });

      return updated;
    }),

  /** Charge a no-show fee using a stored payment method. */
  chargeNoShow: hostProcedure
    .input(
      z.object({
        reservationId: z.string().cuid(),
        amount: z.number().int().min(50).max(100000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
        include: {
          customer: { select: { email: true } },
          deposits: {
            where: { stripePaymentMethodId: { not: null } },
            select: { stripePaymentMethodId: true },
            take: 1,
          },
        },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      if (reservation.status !== "NO_SHOW") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reservation is not marked as no-show",
        });
      }

      const paymentMethodId = reservation.deposits[0]?.stripePaymentMethodId;
      if (!paymentMethodId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No card on file for this reservation",
        });
      }

      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { id: ctx.restaurantId },
        select: { stripeAccountId: true, currency: true },
      });

      if (!restaurant?.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stripe not connected",
        });
      }

      const { paymentIntentId } = await chargeNoShowFee({
        amount: input.amount,
        currency: restaurant.currency,
        stripeAccountId: restaurant.stripeAccountId,
        paymentMethodId,
        reservationId: input.reservationId,
        customerEmail: reservation.customer?.email ?? undefined,
      });

      const deposit = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.deposit.create({
          data: {
            amount: input.amount,
            currency: restaurant.currency,
            status: "CAPTURED",
            type: "no_show_fee",
            stripePaymentIntentId: paymentIntentId,
            reservationId: input.reservationId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "payment.chargeNoShow",
            entityType: "Deposit",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              amount: input.amount,
              reservationId: input.reservationId,
              paymentIntentId,
            },
          },
        });

        return created;
      });

      return deposit;
    }),

  // ─── Transaction History ────────────────────────────────────────────────

  /** List recent transactions from Stripe. */
  getRecentTransactions: managerProcedure.query(async ({ ctx }) => {
    const restaurant = await ctx.prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: { stripeAccountId: true },
    });

    if (!restaurant?.stripeAccountId) {
      return [];
    }

    try {
      return await listRecentCharges(restaurant.stripeAccountId, 20);
    } catch {
      return [];
    }
  }),

  /** List deposits from the database with reservation details. */
  listDeposits: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const [deposits, total] = await Promise.all([
        ctx.prisma.deposit.findMany({
          where: {
            reservation: { restaurantId: ctx.restaurantId },
          },
          include: {
            reservation: {
              select: {
                id: true,
                date: true,
                partySize: true,
                customer: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.pageSize,
        }),
        ctx.prisma.deposit.count({
          where: {
            reservation: { restaurantId: ctx.restaurantId },
          },
        }),
      ]);

      return {
        deposits,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),
});
