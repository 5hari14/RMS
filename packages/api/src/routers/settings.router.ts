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
});
