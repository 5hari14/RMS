import { z } from "zod";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subWeeks,
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  getHours,
} from "date-fns";
import { createRouter, managerProcedure } from "../trpc";

const dateRangeInput = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const analyticsRouter = createRouter({
  /** Total bookings, covers, walk-ins, no-shows, cancellations, occupancy for a date. */
  getDailySummary: managerProcedure
    .input(z.object({ date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const dayStart = startOfDay(input.date);
      const dayEnd = endOfDay(input.date);

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: dayStart, lte: dayEnd },
        },
        select: { partySize: true, status: true, source: true, tableId: true },
      });

      const totalTables = await ctx.prisma.table.count({
        where: {
          floorPlan: { restaurantId: ctx.restaurantId, isActive: true },
          isActive: true,
        },
      });

      const totalBookings = reservations.length;
      const totalCovers = reservations.reduce((s, r) => s + r.partySize, 0);
      const walkIns = reservations.filter((r) => r.source === "WALK_IN").length;
      const noShows = reservations.filter((r) => r.status === "NO_SHOW").length;
      const cancellations = reservations.filter((r) => r.status === "CANCELLED").length;
      const seatedOrCompleted = reservations.filter(
        (r) => r.status === "SEATED" || r.status === "COMPLETED",
      );
      const tablesUsed = new Set(seatedOrCompleted.map((r) => r.tableId).filter(Boolean)).size;
      const occupancyRate = totalTables > 0 ? Math.round((tablesUsed / totalTables) * 100) : 0;

      return {
        totalBookings,
        totalCovers,
        walkIns,
        noShows,
        cancellations,
        occupancyRate,
        totalTables,
      };
    }),

  /** Aggregated stats for a date range. */
  getDateRangeSummary: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const start = startOfDay(input.startDate);
      const end = endOfDay(input.endDate);

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: start, lte: end },
        },
        select: { partySize: true, status: true, source: true, date: true },
      });

      const totalBookings = reservations.length;
      const totalCovers = reservations.reduce((s, r) => s + r.partySize, 0);
      const noShows = reservations.filter((r) => r.status === "NO_SHOW").length;
      const cancellations = reservations.filter((r) => r.status === "CANCELLED").length;
      const walkIns = reservations.filter((r) => r.source === "WALK_IN").length;
      const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0;

      const days = eachDayOfInterval({ start, end });
      const avgCoversPerDay = days.length > 0 ? Math.round(totalCovers / days.length) : 0;

      return {
        totalBookings,
        totalCovers,
        noShows,
        noShowRate,
        cancellations,
        walkIns,
        avgCoversPerDay,
        days: days.length,
      };
    }),

  /** Previous period summary for comparison. */
  getPreviousPeriodSummary: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const rangeDays =
        Math.ceil(
          (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      const prevEnd = new Date(input.startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - rangeDays + 1);

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: startOfDay(prevStart), lte: endOfDay(prevEnd) },
        },
        select: { partySize: true, status: true },
      });

      const totalBookings = reservations.length;
      const totalCovers = reservations.reduce((s, r) => s + r.partySize, 0);
      const noShows = reservations.filter((r) => r.status === "NO_SHOW").length;
      const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0;
      const avgCoversPerDay = rangeDays > 0 ? Math.round(totalCovers / rangeDays) : 0;

      return { totalBookings, totalCovers, noShows, noShowRate, avgCoversPerDay };
    }),

  /** Reservation count by source. */
  getBookingSourceBreakdown: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: startOfDay(input.startDate), lte: endOfDay(input.endDate) },
        },
        select: { source: true },
      });

      const counts: Record<string, number> = {};
      for (const r of reservations) {
        counts[r.source] = (counts[r.source] ?? 0) + 1;
      }

      return Object.entries(counts).map(([source, count]) => ({
        source,
        count,
      }));
    }),

  /** Average covers by hour of day. */
  getPeakTimeAnalysis: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: startOfDay(input.startDate), lte: endOfDay(input.endDate) },
          status: { notIn: ["CANCELLED"] },
        },
        select: { time: true, partySize: true },
      });

      const hourlyCovers: Record<number, { total: number; count: number }> = {};
      for (let h = 0; h < 24; h++) {
        hourlyCovers[h] = { total: 0, count: 0 };
      }

      for (const r of reservations) {
        const hour = getHours(new Date(r.time));
        hourlyCovers[hour]!.total += r.partySize;
        hourlyCovers[hour]!.count += 1;
      }

      return Object.entries(hourlyCovers)
        .map(([hour, data]) => ({
          hour: Number(hour),
          label: `${Number(hour).toString().padStart(2, "0")}:00`,
          covers: data.total,
          bookings: data.count,
        }))
        .filter((h) => h.covers > 0 || (h.hour >= 11 && h.hour <= 23));
    }),

  /** No-show count and rate, trended weekly. */
  getNoShowRate: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const start = startOfDay(input.startDate);
      const end = endOfDay(input.endDate);

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: start, lte: end },
        },
        select: { date: true, status: true },
      });

      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekRes = reservations.filter((r) => {
          const d = new Date(r.date);
          return d >= weekStart && d <= weekEnd;
        });
        const total = weekRes.length;
        const noShows = weekRes.filter((r) => r.status === "NO_SHOW").length;
        return {
          week: format(weekStart, "MMM d"),
          total,
          noShows,
          rate: total > 0 ? Math.round((noShows / total) * 100) : 0,
        };
      });
    }),

  /** Top customers by visit count. */
  getTopCustomers: managerProcedure
    .input(
      dateRangeInput.extend({ limit: z.number().int().min(1).max(50).default(10) }),
    )
    .query(async ({ ctx, input }) => {
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: startOfDay(input.startDate), lte: endOfDay(input.endDate) },
          status: { in: ["SEATED", "COMPLETED"] },
        },
        select: {
          partySize: true,
          customerId: true,
          customer: {
            select: { firstName: true, lastName: true, isVip: true },
          },
          deposits: {
            where: { status: "CAPTURED", type: "deposit" },
            select: { amount: true },
          },
        },
      });

      const customerMap = new Map<
        string,
        {
          name: string;
          isVip: boolean;
          visits: number;
          covers: number;
          totalSpend: number;
        }
      >();

      for (const r of reservations) {
        const existing = customerMap.get(r.customerId);
        const depositTotal = r.deposits.reduce((s, d) => s + d.amount, 0);
        if (existing) {
          existing.visits += 1;
          existing.covers += r.partySize;
          existing.totalSpend += depositTotal;
        } else {
          customerMap.set(r.customerId, {
            name: `${r.customer.firstName} ${r.customer.lastName ?? ""}`.trim(),
            isVip: r.customer.isVip,
            visits: 1,
            covers: r.partySize,
            totalSpend: depositTotal,
          });
        }
      }

      return Array.from(customerMap.values())
        .sort((a, b) => b.visits - a.visits)
        .slice(0, input.limit);
    }),

  /** Occupancy rate per table. */
  getTableUtilisation: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const tables = await ctx.prisma.table.findMany({
        where: {
          floorPlan: { restaurantId: ctx.restaurantId, isActive: true },
          isActive: true,
        },
        select: { id: true, number: true, name: true, section: true, maxCovers: true },
      });

      const days = eachDayOfInterval({
        start: startOfDay(input.startDate),
        end: endOfDay(input.endDate),
      });
      const totalSlots = tables.length * days.length;

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: startOfDay(input.startDate), lte: endOfDay(input.endDate) },
          status: { in: ["SEATED", "COMPLETED", "CONFIRMED"] },
          tableId: { not: null },
        },
        select: { tableId: true, date: true },
      });

      // Count reservations per table
      const tableBookings = new Map<string, number>();
      for (const r of reservations) {
        if (r.tableId) {
          tableBookings.set(r.tableId, (tableBookings.get(r.tableId) ?? 0) + 1);
        }
      }

      const result = tables.map((table) => {
        const bookings = tableBookings.get(table.id) ?? 0;
        const occupancyRate = days.length > 0 ? Math.round((bookings / days.length) * 100) : 0;
        return {
          tableNumber: table.number,
          tableName: table.name,
          section: table.section,
          maxCovers: table.maxCovers,
          bookings,
          occupancyRate: Math.min(occupancyRate, 100),
        };
      });

      return {
        tables: result.sort((a, b) => b.occupancyRate - a.occupancyRate),
        totalSlots,
        totalBookedSlots: reservations.length,
        overallOccupancy:
          totalSlots > 0 ? Math.round((reservations.length / totalSlots) * 100) : 0,
      };
    }),

  /** Covers and bookings per week for the last N weeks. */
  getWeeklyTrend: managerProcedure
    .input(z.object({ weeks: z.number().int().min(1).max(52).default(12) }))
    .query(async ({ ctx, input }) => {
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });
      const start = startOfWeek(subWeeks(new Date(), input.weeks - 1), {
        weekStartsOn: 1,
      });

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: start, lte: end },
          status: { notIn: ["CANCELLED"] },
        },
        select: { date: true, partySize: true },
      });

      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekRes = reservations.filter((r) => {
          const d = new Date(r.date);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          week: format(weekStart, "MMM d"),
          bookings: weekRes.length,
          covers: weekRes.reduce((s, r) => s + r.partySize, 0),
        };
      });
    }),

  /** Daily covers for a date range (for line chart). */
  getDailyCovers: managerProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const start = startOfDay(input.startDate);
      const end = endOfDay(input.endDate);

      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          date: { gte: start, lte: end },
          status: { notIn: ["CANCELLED"] },
        },
        select: { date: true, partySize: true },
      });

      const days = eachDayOfInterval({ start, end });

      return days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayRes = reservations.filter((r) => {
          const d = new Date(r.date);
          return d >= dayStart && d <= dayEnd;
        });
        return {
          date: format(day, "MMM d"),
          covers: dayRes.reduce((s, r) => s + r.partySize, 0),
          bookings: dayRes.length,
        };
      });
    }),
});
