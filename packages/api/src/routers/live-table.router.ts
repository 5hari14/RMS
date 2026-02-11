import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, hostProcedure, protectedProcedure } from "../trpc";
import { addHours, subMinutes, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import type { LiveTableData, LiveTableStatus, LiveReservationInfo, LiveSummary } from "@bites-rms/types";
import { emitToRestaurant } from "../socket";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ReservationWithCustomer {
  id: string;
  status: string;
  time: Date;
  partySize: number;
  seatedAt: Date | null;
  tableId: string | null;
  customer: {
    firstName: string;
    lastName: string | null;
  };
}

function computeTableStatus(
  reservations: ReservationWithCustomer[],
  now: Date,
): { status: LiveTableStatus; reservation?: LiveReservationInfo } {
  // Check for SEATED reservation first
  const seated = reservations.find((r) => r.status === "SEATED");
  if (seated) {
    return {
      status: "SEATED",
      reservation: {
        id: seated.id,
        guestName: [seated.customer.firstName, seated.customer.lastName].filter(Boolean).join(" "),
        partySize: seated.partySize,
        time: seated.time.toISOString(),
        seatedAt: seated.seatedAt?.toISOString(),
      },
    };
  }

  // Check for CONFIRMED reservations within the next 2 hours
  const twoHoursFromNow = addHours(now, 2);
  const upcoming = reservations
    .filter(
      (r) =>
        (r.status === "CONFIRMED" || r.status === "PENDING") &&
        r.time >= now &&
        r.time <= twoHoursFromNow,
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  if (upcoming.length > 0) {
    const next = upcoming[0]!;
    return {
      status: "RESERVED",
      reservation: {
        id: next.id,
        guestName: [next.customer.firstName, next.customer.lastName].filter(Boolean).join(" "),
        partySize: next.partySize,
        time: next.time.toISOString(),
      },
    };
  }

  // Check for LATE reservations (confirmed but past reservation time by 15+ minutes)
  const lateThreshold = subMinutes(now, 15);
  const late = reservations
    .filter(
      (r) =>
        (r.status === "CONFIRMED" || r.status === "PENDING") &&
        r.time < now &&
        r.time <= lateThreshold,
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  if (late.length > 0) {
    const latestLate = late[0]!;
    return {
      status: "LATE",
      reservation: {
        id: latestLate.id,
        guestName: [latestLate.customer.firstName, latestLate.customer.lastName]
          .filter(Boolean)
          .join(" "),
        partySize: latestLate.partySize,
        time: latestLate.time.toISOString(),
      },
    };
  }

  return { status: "AVAILABLE" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const liveTableRouter = createRouter({
  /**
   * Get all tables for a floor plan with their live status computed from
   * today's reservations.
   */
  getStatus: protectedProcedure
    .input(z.object({ floorPlanId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.prisma.floorPlan.findFirst({
        where: { id: input.floorPlanId, restaurantId: ctx.restaurantId },
        include: {
          tables: { orderBy: { number: "asc" } },
        },
      });

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Floor plan not found" });
      }

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Fetch all active reservations for today across all tables in this floor plan
      const tableIds = plan.tables.map((t) => t.id);
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          tableId: { in: tableIds },
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
        },
        include: {
          customer: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      // Group reservations by table
      const reservationsByTable = new Map<string, ReservationWithCustomer[]>();
      for (const r of reservations) {
        if (!r.tableId) continue;
        const list = reservationsByTable.get(r.tableId) ?? [];
        list.push(r as ReservationWithCustomer);
        reservationsByTable.set(r.tableId, list);
      }

      const tables: LiveTableData[] = plan.tables.map((table) => {
        const tableReservations = reservationsByTable.get(table.id) ?? [];

        // If the table is inactive, it's blocked
        if (!table.isActive) {
          return {
            tableId: table.id,
            dbId: table.id,
            number: table.number,
            name: table.name,
            minCovers: table.minCovers,
            maxCovers: table.maxCovers,
            shape: table.shape,
            section: table.section,
            x: table.x,
            y: table.y,
            width: table.width,
            height: table.height,
            isAccessible: table.isAccessible,
            status: "BLOCKED" as LiveTableStatus,
          };
        }

        const { status, reservation } = computeTableStatus(tableReservations, now);

        return {
          tableId: table.id,
          dbId: table.id,
          number: table.number,
          name: table.name,
          minCovers: table.minCovers,
          maxCovers: table.maxCovers,
          shape: table.shape,
          section: table.section,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          isAccessible: table.isAccessible,
          status,
          reservation,
        };
      });

      return tables;
    }),

  /**
   * Get summary stats for the restaurant.
   */
  getSummary: protectedProcedure
    .input(z.object({ floorPlanId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.prisma.floorPlan.findFirst({
        where: { id: input.floorPlanId, restaurantId: ctx.restaurantId },
        include: { tables: { select: { id: true, isActive: true } } },
      });

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Floor plan not found" });
      }

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const oneHourFromNow = addHours(now, 1);

      const tableIds = plan.tables.filter((t) => t.isActive).map((t) => t.id);

      const todayReservations = await ctx.prisma.reservation.findMany({
        where: {
          restaurantId: ctx.restaurantId,
          tableId: { in: tableIds },
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
        },
        select: { id: true, status: true, partySize: true, time: true, tableId: true },
      });

      const seatedReservations = todayReservations.filter((r) => r.status === "SEATED");
      const seatedTableIds = new Set(seatedReservations.map((r) => r.tableId));
      const seatedCovers = seatedReservations.reduce((sum, r) => sum + r.partySize, 0);

      // Tables with upcoming reservations (not seated)
      const reservedTableIds = new Set(
        todayReservations
          .filter(
            (r) =>
              (r.status === "CONFIRMED" || r.status === "PENDING") &&
              r.time >= now &&
              r.tableId,
          )
          .map((r) => r.tableId),
      );

      const reservedNextHour = todayReservations.filter(
        (r) =>
          (r.status === "CONFIRMED" || r.status === "PENDING") &&
          r.time >= now &&
          r.time <= oneHourFromNow,
      ).length;

      const availableCount = tableIds.filter(
        (id) => !seatedTableIds.has(id) && !reservedTableIds.has(id),
      ).length;

      // Waitlist count
      const waitlistCount = await ctx.prisma.waitlistEntry.count({
        where: {
          restaurantId: ctx.restaurantId,
          status: "WAITING",
        },
      });

      const summary: LiveSummary = {
        available: availableCount,
        seated: seatedTableIds.size,
        seatedCovers,
        reservedNextHour,
        waitlist: waitlistCount,
      };

      return summary;
    }),

  /**
   * Seat a walk-in party: creates a customer, reservation (SEATED), and assigns the table.
   */
  seatWalkIn: hostProcedure
    .input(
      z.object({
        tableId: z.string().cuid(),
        guestName: z.string().min(1).max(200),
        partySize: z.number().int().min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.prisma.table.findFirst({
        where: { id: input.tableId, floorPlan: { restaurantId: ctx.restaurantId } },
      });

      if (!table) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      const now = new Date();
      const nameParts = input.guestName.split(" ");
      const firstName = nameParts[0] ?? "Guest";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      const reservation = await ctx.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            firstName,
            lastName,
            restaurantId: ctx.restaurantId,
          },
        });

        const created = await tx.reservation.create({
          data: {
            date: now,
            time: now,
            partySize: input.partySize,
            duration: 120,
            status: "SEATED",
            source: "WALK_IN",
            seatedAt: now,
            tableId: input.tableId,
            customerId: customer.id,
            restaurantId: ctx.restaurantId,
            createdById: ctx.user.id,
          },
          include: {
            customer: { select: { firstName: true, lastName: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            action: "reservation.seatWalkIn",
            entityType: "Reservation",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              tableId: input.tableId,
              partySize: input.partySize,
              guestName: input.guestName,
            },
          },
        });

        return created;
      });

      // Emit real-time update
      emitToRestaurant(ctx.restaurantId, "table:statusChanged", {
        tableId: input.tableId,
        status: "SEATED",
        reservation: {
          id: reservation.id,
          guestName: input.guestName,
          partySize: input.partySize,
          time: now.toISOString(),
          seatedAt: now.toISOString(),
        },
      });

      emitToRestaurant(ctx.restaurantId, "reservation:created", {
        reservationId: reservation.id,
        tableId: input.tableId,
        status: "SEATED",
        guestName: input.guestName,
        partySize: input.partySize,
      });

      return reservation;
    }),

  /**
   * Block a table (set isActive = false).
   */
  blockTable: hostProcedure
    .input(z.object({ tableId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.prisma.table.findFirst({
        where: { id: input.tableId, floorPlan: { restaurantId: ctx.restaurantId } },
      });

      if (!table) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.table.update({
          where: { id: input.tableId },
          data: { isActive: false },
        });

        await tx.auditLog.create({
          data: {
            action: "table.block",
            entityType: "Table",
            entityId: input.tableId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { tableNumber: table.number },
          },
        });
      });

      emitToRestaurant(ctx.restaurantId, "table:statusChanged", {
        tableId: input.tableId,
        status: "BLOCKED",
      });

      return { success: true };
    }),

  /**
   * Unblock a table (set isActive = true).
   */
  unblockTable: hostProcedure
    .input(z.object({ tableId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.prisma.table.findFirst({
        where: { id: input.tableId, floorPlan: { restaurantId: ctx.restaurantId } },
      });

      if (!table) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.table.update({
          where: { id: input.tableId },
          data: { isActive: true },
        });

        await tx.auditLog.create({
          data: {
            action: "table.unblock",
            entityType: "Table",
            entityId: input.tableId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { tableNumber: table.number },
          },
        });
      });

      emitToRestaurant(ctx.restaurantId, "table:statusChanged", {
        tableId: input.tableId,
        status: "AVAILABLE",
      });

      return { success: true };
    }),

  /**
   * Seat a reserved party — transitions reservation to SEATED.
   */
  seatReservation: hostProcedure
    .input(z.object({ reservationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
        include: { customer: { select: { firstName: true, lastName: true } } },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      if (reservation.status !== "CONFIRMED" && reservation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot seat a ${reservation.status.toLowerCase()} reservation`,
        });
      }

      const now = new Date();

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.reservation.update({
          where: { id: input.reservationId },
          data: { status: "SEATED", seatedAt: now },
          include: { customer: { select: { firstName: true, lastName: true } } },
        });

        await tx.auditLog.create({
          data: {
            action: "reservation.seat",
            entityType: "Reservation",
            entityId: input.reservationId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { from: reservation.status, to: "SEATED" },
          },
        });

        return result;
      });

      if (updated.tableId) {
        const guestName = [updated.customer.firstName, updated.customer.lastName]
          .filter(Boolean)
          .join(" ");

        emitToRestaurant(ctx.restaurantId, "table:statusChanged", {
          tableId: updated.tableId,
          status: "SEATED",
          reservation: {
            id: updated.id,
            guestName,
            partySize: updated.partySize,
            time: updated.time.toISOString(),
            seatedAt: now.toISOString(),
          },
        });
      }

      return updated;
    }),

  /**
   * Complete a reservation — transitions to COMPLETED and frees the table.
   */
  completeReservation: hostProcedure
    .input(z.object({ reservationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      if (reservation.status !== "SEATED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot complete a ${reservation.status.toLowerCase()} reservation`,
        });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.reservation.update({
          where: { id: input.reservationId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            action: "reservation.complete",
            entityType: "Reservation",
            entityId: input.reservationId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { from: "SEATED", to: "COMPLETED" },
          },
        });

        return result;
      });

      if (updated.tableId) {
        emitToRestaurant(ctx.restaurantId, "table:statusChanged", {
          tableId: updated.tableId,
          status: "AVAILABLE",
        });
      }

      return updated;
    }),

  /**
   * Mark a reservation as no-show.
   */
  markNoShow: hostProcedure
    .input(z.object({ reservationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: ctx.restaurantId },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      if (reservation.status !== "CONFIRMED" && reservation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark a ${reservation.status.toLowerCase()} reservation as no-show`,
        });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.reservation.update({
          where: { id: input.reservationId },
          data: { status: "NO_SHOW", cancelledAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            action: "reservation.noShow",
            entityType: "Reservation",
            entityId: input.reservationId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { from: reservation.status, to: "NO_SHOW" },
          },
        });

        return result;
      });

      if (updated.tableId) {
        emitToRestaurant(ctx.restaurantId, "table:statusChanged", {
          tableId: updated.tableId,
          status: "AVAILABLE",
        });
      }

      return updated;
    }),
});
