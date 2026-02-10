import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../trpc";

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
      },
    });

    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
    }

    return restaurant;
  }),
});
