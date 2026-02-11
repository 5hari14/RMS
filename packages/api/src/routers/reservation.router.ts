import { TRPCError } from "@trpc/server";
import type { ReservationStatus } from "@bites-rms/db";
import { createRouter, protectedProcedure, hostProcedure } from "../trpc";
import { z } from "zod";
import {
  getByIdSchema,
  getByDateSchema,
  getByDateRangeSchema,
  getByCustomerSchema,
  getUpcomingSchema,
  searchSchema,
  createReservationSchema,
  updateReservationSchema,
  updateStatusSchema,
  cancelSchema,
  assignTableSchema,
} from "../schemas/reservation.schema";
import { sendConfirmation, sendCancellation } from "../services/notification.service";
import {
  buildNotificationData,
  getNotificationPreferences,
} from "../services/notification-helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Shared includes for returning reservation with relations
// ─────────────────────────────────────────────────────────────────────────────

const reservationInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isVip: true,
      isBlacklisted: true,
    },
  },
  table: {
    select: {
      id: true,
      number: true,
      name: true,
      section: true,
      minCovers: true,
      maxCovers: true,
    },
  },
  tags: { select: { id: true, label: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SEATED", "CANCELLED", "NO_SHOW"],
  SEATED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const DEFAULT_DURATION_MINUTES = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const reservationRouter = createRouter({
  // ─── Queries ──────────────────────────────────────────────────────────

  getById: protectedProcedure.input(getByIdSchema).query(async ({ ctx, input }) => {
    const reservation = await ctx.prisma.reservation.findFirst({
      where: { id: input.id, restaurantId: ctx.restaurantId },
      include: reservationInclude,
    });

    if (!reservation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    return reservation;
  }),

  getByDate: protectedProcedure.input(getByDateSchema).query(async ({ ctx, input }) => {
    return ctx.prisma.reservation.findMany({
      where: {
        restaurantId: ctx.restaurantId,
        date: input.date,
        status: { not: "CANCELLED" },
      },
      include: reservationInclude,
      orderBy: { time: "asc" },
    });
  }),

  getByDateRange: protectedProcedure
    .input(getByDateRangeSchema)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: input.startDate, lte: input.endDate },
          status: { not: "CANCELLED" },
        },
        include: reservationInclude,
        orderBy: [{ date: "asc" }, { time: "asc" }],
      });
    }),

  getByCustomer: protectedProcedure
    .input(getByCustomerSchema)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          customerId: input.customerId,
        },
        include: reservationInclude,
        orderBy: [{ date: "desc" }, { time: "desc" }],
      });
    }),

  getUpcoming: protectedProcedure.input(getUpcomingSchema).query(async ({ ctx, input }) => {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + input.days);

    return ctx.prisma.reservation.findMany({
      where: {
        restaurantId: ctx.restaurantId,
        date: { gte: now, lte: endDate },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      include: reservationInclude,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  }),

  search: protectedProcedure.input(searchSchema).query(async ({ ctx, input }) => {
    const q = input.query.trim();

    return ctx.prisma.reservation.findMany({
      where: {
        restaurantId: ctx.restaurantId,
        customer: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      include: reservationInclude,
      orderBy: [{ date: "desc" }, { time: "desc" }],
      take: 50,
    });
  }),

  getAuditLog: protectedProcedure
    .input(z.object({ reservationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.auditLog.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          entityType: "Reservation",
          entityId: input.reservationId,
        },
        select: {
          id: true,
          createdAt: true,
          action: true,
          details: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  // ─── Mutations ────────────────────────────────────────────────────────

  create: hostProcedure.input(createReservationSchema).mutation(async ({ ctx, input }) => {
    const { customerId, customerName, customerEmail, customerPhone, tags, ...data } = input;

    // Validate date is not in the past
    const now = new Date();
    const reservationDate = new Date(data.date);
    reservationDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reservationDate < today) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Reservation date cannot be in the past",
      });
    }

    // Resolve or create customer
    let resolvedCustomerId = customerId;

    if (!resolvedCustomerId) {
      // Try to find existing customer by email or phone
      let existingCustomer = null;

      if (customerEmail) {
        existingCustomer = await ctx.prisma.customer.findFirst({
          where: { email: customerEmail, restaurantId: ctx.restaurantId },
        });
      }

      if (!existingCustomer && customerPhone) {
        existingCustomer = await ctx.prisma.customer.findFirst({
          where: { phone: customerPhone, restaurantId: ctx.restaurantId },
        });
      }

      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      } else {
        // Create new customer
        const nameParts = (customerName ?? "").split(" ");
        const firstName = nameParts[0] ?? "Guest";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

        const newCustomer = await ctx.prisma.customer.create({
          data: {
            firstName,
            lastName,
            email: customerEmail,
            phone: customerPhone,
            restaurantId: ctx.restaurantId,
          },
        });
        resolvedCustomerId = newCustomer.id;
      }
    }

    // Check table conflict if tableId provided
    if (data.tableId) {
      await assertNoTableConflict(ctx.prisma, {
        tableId: data.tableId,
        restaurantId: ctx.restaurantId,
        date: data.date,
        startTime: data.time,
        durationMinutes: data.duration ?? DEFAULT_DURATION_MINUTES,
      });
    }

    // Create reservation with tags in a transaction
    const reservation = await ctx.prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: {
          date: data.date,
          time: data.time,
          partySize: data.partySize,
          duration: data.duration ?? DEFAULT_DURATION_MINUTES,
          source: data.source,
          specialRequests: data.specialRequests,
          internalNotes: data.internalNotes,
          tableId: data.tableId,
          customerId: resolvedCustomerId!,
          restaurantId: ctx.restaurantId,
          createdById: ctx.user.id,
          tags: tags?.length
            ? { create: tags.map((label) => ({ label })) }
            : undefined,
        },
        include: reservationInclude,
      });

      await tx.auditLog.create({
        data: {
          action: "reservation.create",
          entityType: "Reservation",
          entityId: created.id,
          userId: ctx.user.id,
          restaurantId: ctx.restaurantId,
          details: {
            date: data.date.toISOString(),
            partySize: data.partySize,
            source: data.source,
            customerId: resolvedCustomerId,
            tableId: data.tableId ?? null,
          },
        },
      });

      return created;
    });

    // Send confirmation notification (fire-and-forget)
    getNotificationPreferences(ctx.prisma, ctx.restaurantId)
      .then((prefs) =>
        sendConfirmation(
          buildNotificationData(reservation, ctx.session.user.restaurantName),
          prefs,
        ),
      )
      .catch((err) =>
        console.error("[notification] Failed to send confirmation:", err),
      );

    return reservation;
  }),

  update: hostProcedure.input(updateReservationSchema).mutation(async ({ ctx, input }) => {
    const { id, tags, ...updates } = input;

    // Verify reservation exists and belongs to restaurant
    const existing = await ctx.prisma.reservation.findFirst({
      where: { id, restaurantId: ctx.restaurantId },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot update a ${existing.status.toLowerCase()} reservation`,
      });
    }

    // Check table conflict if table or time is changing
    const newTableId = updates.tableId !== undefined ? updates.tableId : existing.tableId;
    const newDate = updates.date ?? existing.date;
    const newTime = updates.time ?? existing.time;
    const newDuration = updates.duration ?? existing.duration;

    if (newTableId && (updates.tableId !== undefined || updates.date || updates.time || updates.duration)) {
      await assertNoTableConflict(ctx.prisma, {
        tableId: newTableId,
        restaurantId: ctx.restaurantId,
        date: newDate,
        startTime: newTime,
        durationMinutes: newDuration,
        excludeId: id,
      });
    }

    const reservation = await ctx.prisma.$transaction(async (tx) => {
      // If tags are provided, replace all tags
      if (tags !== undefined) {
        await tx.reservationTag.deleteMany({ where: { reservationId: id } });
        if (tags.length > 0) {
          await tx.reservationTag.createMany({
            data: tags.map((label) => ({ label, reservationId: id })),
          });
        }
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          ...(updates.date !== undefined && { date: updates.date }),
          ...(updates.time !== undefined && { time: updates.time }),
          ...(updates.partySize !== undefined && { partySize: updates.partySize }),
          ...(updates.duration !== undefined && { duration: updates.duration }),
          ...(updates.tableId !== undefined && { tableId: updates.tableId }),
          ...(updates.specialRequests !== undefined && { specialRequests: updates.specialRequests }),
          ...(updates.internalNotes !== undefined && { internalNotes: updates.internalNotes }),
        },
        include: reservationInclude,
      });

      await tx.auditLog.create({
        data: {
          action: "reservation.update",
          entityType: "Reservation",
          entityId: id,
          userId: ctx.user.id,
          restaurantId: ctx.restaurantId,
          details: { changes: updates, tags },
        },
      });

      return updated;
    });

    return reservation;
  }),

  updateStatus: hostProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.reservation.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${existing.status} to ${input.status}. Allowed: ${allowed.join(", ") || "none"}`,
        });
      }

      const reservation = await ctx.prisma.$transaction(async (tx) => {
        // Build status-specific timestamp updates
        const timestamps: Record<string, Date> = {};
        if (input.status === "CONFIRMED") timestamps.confirmedAt = new Date();
        if (input.status === "SEATED") timestamps.seatedAt = new Date();
        if (input.status === "COMPLETED") timestamps.completedAt = new Date();
        if (input.status === "CANCELLED") timestamps.cancelledAt = new Date();
        if (input.status === "NO_SHOW") timestamps.cancelledAt = new Date();

        const updated = await tx.reservation.update({
          where: { id: input.id },
          data: { status: input.status, ...timestamps },
          include: reservationInclude,
        });

        await tx.auditLog.create({
          data: {
            action: "reservation.updateStatus",
            entityType: "Reservation",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              from: existing.status,
              to: input.status,
            },
          },
        });

        return updated;
      });

      // Send confirmation notification when status moves to CONFIRMED
      if (input.status === "CONFIRMED") {
        getNotificationPreferences(ctx.prisma, ctx.restaurantId)
          .then((prefs) =>
            sendConfirmation(
              buildNotificationData(reservation, ctx.session.user.restaurantName),
              prefs,
            ),
          )
          .catch((err) =>
            console.error("[notification] Failed to send confirmation:", err),
          );
      }

      return reservation;
    }),

  cancel: hostProcedure.input(cancelSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.reservation.findFirst({
      where: { id: input.id, restaurantId: ctx.restaurantId },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes("CANCELLED")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot cancel a ${existing.status.toLowerCase()} reservation`,
      });
    }

    const reservation = await ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: input.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          internalNotes: input.reason
            ? [existing.internalNotes, `Cancellation reason: ${input.reason}`]
                .filter(Boolean)
                .join("\n")
            : existing.internalNotes,
        },
        include: reservationInclude,
      });

      await tx.auditLog.create({
        data: {
          action: "reservation.cancel",
          entityType: "Reservation",
          entityId: input.id,
          userId: ctx.user.id,
          restaurantId: ctx.restaurantId,
          details: { from: existing.status, reason: input.reason ?? null },
        },
      });

      return updated;
    });

    // Send cancellation notification (fire-and-forget)
    getNotificationPreferences(ctx.prisma, ctx.restaurantId)
      .then((prefs) =>
        sendCancellation(
          buildNotificationData(reservation, ctx.session.user.restaurantName),
          prefs,
        ),
      )
      .catch((err) =>
        console.error("[notification] Failed to send cancellation:", err),
      );

    return reservation;
  }),

  assignTable: hostProcedure.input(assignTableSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.reservation.findFirst({
      where: { id: input.id, restaurantId: ctx.restaurantId },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
    }

    if (existing.status === "CANCELLED" || existing.status === "COMPLETED" || existing.status === "NO_SHOW") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot assign table to a ${existing.status.toLowerCase()} reservation`,
      });
    }

    // Verify table belongs to a floor plan in this restaurant
    const table = await ctx.prisma.table.findFirst({
      where: {
        id: input.tableId,
        floorPlan: { restaurantId: ctx.restaurantId },
      },
    });

    if (!table) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
    }

    // Check for conflicts
    await assertNoTableConflict(ctx.prisma, {
      tableId: input.tableId,
      restaurantId: ctx.restaurantId,
      date: existing.date,
      startTime: existing.time,
      durationMinutes: existing.duration,
      excludeId: input.id,
    });

    const reservation = await ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: input.id },
        data: { tableId: input.tableId },
        include: reservationInclude,
      });

      await tx.auditLog.create({
        data: {
          action: "reservation.assignTable",
          entityType: "Reservation",
          entityId: input.id,
          userId: ctx.user.id,
          restaurantId: ctx.restaurantId,
          details: {
            previousTableId: existing.tableId,
            newTableId: input.tableId,
          },
        },
      });

      return updated;
    });

    return reservation;
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Table conflict detection helper
// ─────────────────────────────────────────────────────────────────────────────

interface ConflictCheckOpts {
  tableId: string;
  restaurantId: string;
  date: Date;
  startTime: Date;
  durationMinutes: number;
  excludeId?: string;
}

async function assertNoTableConflict(
  prisma: { reservation: { findMany: Function } },
  opts: ConflictCheckOpts,
) {
  const endTime = new Date(opts.startTime.getTime() + opts.durationMinutes * 60_000);

  // Fetch all active reservations for this table on this date
  const candidates = await (prisma.reservation.findMany as Function)({
    where: {
      tableId: opts.tableId,
      restaurantId: opts.restaurantId,
      date: opts.date,
      status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    select: { id: true, time: true, duration: true },
  }) as Array<{ id: string; time: Date; duration: number }>;

  for (const r of candidates) {
    const existingEnd = new Date(r.time.getTime() + r.duration * 60_000);
    // Overlap: existing.start < new.end AND existing.end > new.start
    if (r.time < endTime && existingEnd > opts.startTime) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Table already has a reservation during this time slot",
      });
    }
  }
}
