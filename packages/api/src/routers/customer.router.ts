import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";

export const customerRouter = createRouter({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();

      return ctx.prisma.customer.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isVip: true,
          isBlacklisted: true,
          allergies: true,
          dietaryRequirements: true,
          _count: { select: { reservations: true } },
        },
        orderBy: { firstName: "asc" },
        take: 20,
      });
    }),
});
