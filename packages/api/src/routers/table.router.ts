import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";

export const tableRouter = createRouter({
  getAvailable: protectedProcedure
    .input(
      z.object({
        date: z.coerce.date(),
        time: z.coerce.date(),
        duration: z.number().int().min(15).max(480).default(120),
        partySize: z.number().int().min(1).max(20),
        excludeReservationId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1. Get all active tables for this restaurant
      const tables = await ctx.prisma.table.findMany({
        where: {
          isActive: true,
          floorPlan: {
            restaurantId: ctx.restaurantId,
            isActive: true,
          },
        },
        select: {
          id: true,
          number: true,
          name: true,
          section: true,
          minCovers: true,
          maxCovers: true,
        },
        orderBy: [{ maxCovers: "asc" }, { number: "asc" }],
      });

      // 2. Get all active reservations for the same date that might conflict
      const endTime = new Date(input.time.getTime() + input.duration * 60_000);

      const conflictingReservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: input.date,
          status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
          tableId: { not: null },
          ...(input.excludeReservationId
            ? { id: { not: input.excludeReservationId } }
            : {}),
        },
        select: {
          tableId: true,
          time: true,
          duration: true,
        },
      });

      // 3. Build set of occupied table IDs
      const occupiedTableIds = new Set<string>();
      for (const r of conflictingReservations) {
        if (!r.tableId) continue;
        const rEnd = new Date(r.time.getTime() + r.duration * 60_000);
        // Overlap check: r.start < input.end AND r.end > input.start
        if (r.time < endTime && rEnd > input.time) {
          occupiedTableIds.add(r.tableId);
        }
      }

      // 4. Filter to available tables that fit the party size, sorted by best fit
      return tables
        .filter(
          (t) =>
            !occupiedTableIds.has(t.id) && t.maxCovers >= input.partySize,
        )
        .sort((a, b) => a.maxCovers - b.maxCovers);
    }),
});
