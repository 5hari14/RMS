import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, protectedProcedure, managerProcedure } from "../trpc";

export const settingsRouter = createRouter({
  getRestaurant: protectedProcedure.query(async ({ ctx }) => {
    const restaurant = await ctx.prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        currency: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        city: true,
        state: true,
        postcode: true,
        country: true,
        logoUrl: true,
        enableEmailConfirmations: true,
        enableSmsConfirmations: true,
        enableReminders: true,
      },
    });

    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
    }

    return restaurant;
  }),

  updateNotificationPreferences: managerProcedure
    .input(
      z.object({
        enableEmailConfirmations: z.boolean().optional(),
        enableSmsConfirmations: z.boolean().optional(),
        enableReminders: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.restaurant.update({
          where: { id: ctx.restaurantId },
          data: {
            ...(input.enableEmailConfirmations !== undefined && {
              enableEmailConfirmations: input.enableEmailConfirmations,
            }),
            ...(input.enableSmsConfirmations !== undefined && {
              enableSmsConfirmations: input.enableSmsConfirmations,
            }),
            ...(input.enableReminders !== undefined && {
              enableReminders: input.enableReminders,
            }),
          },
          select: {
            enableEmailConfirmations: true,
            enableSmsConfirmations: true,
            enableReminders: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "settings.updateNotificationPreferences",
            entityType: "Restaurant",
            entityId: ctx.restaurantId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: input,
          },
        });

        return updated;
      });

      return restaurant;
    }),

  // ─── Booking Widget ─────────────────────────────────────────────────────

  getBookingWidget: protectedProcedure.query(async ({ ctx }) => {
    const widget = await ctx.prisma.bookingWidget.findUnique({
      where: { restaurantId: ctx.restaurantId },
    });

    return widget;
  }),

  upsertBookingWidget: managerProcedure
    .input(
      z.object({
        isEnabled: z.boolean().optional(),
        maxPartySize: z.number().int().min(1).max(50).optional(),
        minAdvanceMinutes: z.number().int().min(0).max(10080).optional(),
        maxAdvanceDays: z.number().int().min(1).max(365).optional(),
        slotIntervalMinutes: z.number().int().min(5).max(60).optional(),
        defaultDurationMinutes: z.number().int().min(15).max(480).optional(),
        confirmationMessage: z.string().max(500).nullable().optional(),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const widget = await ctx.prisma.$transaction(async (tx) => {
        const existing = await tx.bookingWidget.findUnique({
          where: { restaurantId: ctx.restaurantId },
        });

        const upserted = await tx.bookingWidget.upsert({
          where: { restaurantId: ctx.restaurantId },
          create: {
            restaurantId: ctx.restaurantId,
            isEnabled: input.isEnabled ?? true,
            maxPartySize: input.maxPartySize ?? 10,
            minAdvanceMinutes: input.minAdvanceMinutes ?? 60,
            maxAdvanceDays: input.maxAdvanceDays ?? 30,
            slotIntervalMinutes: input.slotIntervalMinutes ?? 15,
            defaultDurationMinutes: input.defaultDurationMinutes ?? 90,
            confirmationMessage: input.confirmationMessage ?? null,
            primaryColor: input.primaryColor ?? "#1e293b",
          },
          update: {
            ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
            ...(input.maxPartySize !== undefined && { maxPartySize: input.maxPartySize }),
            ...(input.minAdvanceMinutes !== undefined && {
              minAdvanceMinutes: input.minAdvanceMinutes,
            }),
            ...(input.maxAdvanceDays !== undefined && { maxAdvanceDays: input.maxAdvanceDays }),
            ...(input.slotIntervalMinutes !== undefined && {
              slotIntervalMinutes: input.slotIntervalMinutes,
            }),
            ...(input.defaultDurationMinutes !== undefined && {
              defaultDurationMinutes: input.defaultDurationMinutes,
            }),
            ...(input.confirmationMessage !== undefined && {
              confirmationMessage: input.confirmationMessage,
            }),
            ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
          },
        });

        await tx.auditLog.create({
          data: {
            action: existing
              ? "settings.updateBookingWidget"
              : "settings.createBookingWidget",
            entityType: "BookingWidget",
            entityId: upserted.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: input,
          },
        });

        return upserted;
      });

      return widget;
    }),
});
