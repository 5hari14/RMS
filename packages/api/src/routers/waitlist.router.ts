import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createRouter,
  protectedProcedure,
  hostProcedure,
} from "../trpc";

export const waitlistRouter = createRouter({
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const entries = await ctx.prisma.waitlistEntry.findMany({
      where: {
        restaurantId: ctx.restaurantId,
        status: { in: ["WAITING", "NOTIFIED"] },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return entries;
  }),

  add: hostProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        phone: z.string().max(30).optional(),
        partySize: z.number().int().min(1).max(50),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.waitlistEntry.create({
          data: {
            name: input.name,
            phone: input.phone ?? null,
            partySize: input.partySize,
            notes: input.notes ?? null,
            restaurantId: ctx.restaurantId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "waitlist.add",
            entityType: "WaitlistEntry",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: input,
          },
        });

        return created;
      });

      return entry;
    }),

  notify: hostProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      }

      if (entry.status !== "WAITING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only notify entries that are WAITING",
        });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.waitlistEntry.update({
          where: { id: input.id },
          data: { status: "NOTIFIED", notifiedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            action: "waitlist.notify",
            entityType: "WaitlistEntry",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
          },
        });

        return result;
      });

      // TODO: Send SMS via Twilio when integration is configured

      return updated;
    }),

  seat: hostProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      }

      if (entry.status === "SEATED" || entry.status === "LEFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry already resolved",
        });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.waitlistEntry.update({
          where: { id: input.id },
          data: { status: "SEATED", seatedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            action: "waitlist.seat",
            entityType: "WaitlistEntry",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
          },
        });

        return result;
      });

      return updated;
    }),

  remove: hostProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.waitlistEntry.update({
          where: { id: input.id },
          data: { status: "LEFT" },
        });

        await tx.auditLog.create({
          data: {
            action: "waitlist.remove",
            entityType: "WaitlistEntry",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
          },
        });

        return result;
      });

      return updated;
    }),

  updateEstimate: hostProcedure
    .input(
      z.object({
        id: z.string(),
        estimatedWaitMinutes: z.number().int().min(0).max(300),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      }

      const updated = await ctx.prisma.waitlistEntry.update({
        where: { id: input.id },
        data: { estimatedWaitMinutes: input.estimatedWaitMinutes },
      });

      return updated;
    }),
});
