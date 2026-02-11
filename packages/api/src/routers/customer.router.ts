import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { subDays } from "date-fns";
import { createRouter, protectedProcedure, hostProcedure } from "../trpc";

// ─────────────────────────────────────────────────────────────────────────────
// Shared includes
// ─────────────────────────────────────────────────────────────────────────────

const customerListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  isVip: true,
  isBlacklisted: true,
  allergies: true,
  dietaryRequirements: true,
  createdAt: true,
  _count: { select: { reservations: true } },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const customerRouter = createRouter({
  // ─── Queries ──────────────────────────────────────────────────────────

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
        include: {
          reservations: {
            include: {
              table: {
                select: { id: true, number: true, name: true, section: true },
              },
            },
            orderBy: [{ date: "desc" }, { time: "desc" }],
          },
          customerNotes: {
            include: {
              author: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      // Compute stats
      const completedReservations = customer.reservations.filter(
        (r) => r.status === "COMPLETED",
      );
      const noShowCount = customer.reservations.filter(
        (r) => r.status === "NO_SHOW",
      ).length;
      const totalVisits = completedReservations.length;
      const lastVisit = completedReservations[0]?.date ?? null;

      return {
        ...customer,
        stats: {
          totalVisits,
          noShowCount,
          lastVisit,
          totalReservations: customer.reservations.length,
        },
      };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();

      const customers = await ctx.prisma.customer.findMany({
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
          ...customerListSelect,
          reservations: {
            where: { status: "COMPLETED" },
            select: { date: true },
            orderBy: { date: "desc" },
            take: 1,
          },
        },
        orderBy: { firstName: "asc" },
        take: 20,
      });

      return customers.map((c) => ({
        ...c,
        lastVisit: c.reservations[0]?.date ?? null,
        reservations: undefined,
      }));
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        sortBy: z
          .enum(["name", "visitCount", "lastVisit", "createdAt"])
          .default("name"),
        sortDir: z.enum(["asc", "desc"]).default("asc"),
        filter: z
          .enum(["all", "vip", "blacklisted", "new"])
          .default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortDir, filter } = input;
      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: Record<string, unknown> = {
        restaurantId: ctx.restaurantId,
      };

      if (filter === "vip") where.isVip = true;
      if (filter === "blacklisted") where.isBlacklisted = true;
      if (filter === "new") {
        where.createdAt = { gte: subDays(new Date(), 30) };
      }

      // Build orderBy
      let orderBy: Record<string, string> | Record<string, Record<string, string>>;
      switch (sortBy) {
        case "name":
          orderBy = { firstName: sortDir };
          break;
        case "visitCount":
          orderBy = { reservations: { _count: sortDir } };
          break;
        case "lastVisit":
          orderBy = { updatedAt: sortDir };
          break;
        case "createdAt":
          orderBy = { createdAt: sortDir };
          break;
        default:
          orderBy = { firstName: sortDir };
      }

      const [customers, total] = await Promise.all([
        ctx.prisma.customer.findMany({
          where,
          select: {
            ...customerListSelect,
            reservations: {
              where: { status: "COMPLETED" },
              select: { date: true },
              orderBy: { date: "desc" },
              take: 1,
            },
          },
          orderBy,
          skip,
          take: pageSize,
        }),
        ctx.prisma.customer.count({ where }),
      ]);

      return {
        customers: customers.map((c) => ({
          ...c,
          lastVisit: c.reservations[0]?.date ?? null,
          reservations: undefined,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getVips: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.customer.findMany({
      where: { restaurantId: ctx.restaurantId, isVip: true },
      select: customerListSelect,
      orderBy: { firstName: "asc" },
    });
  }),

  getBlacklisted: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.customer.findMany({
      where: { restaurantId: ctx.restaurantId, isBlacklisted: true },
      select: customerListSelect,
      orderBy: { firstName: "asc" },
    });
  }),

  // ─── Mutations ────────────────────────────────────────────────────────

  create: hostProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(1).max(30).optional(),
        dietaryRequirements: z.string().max(500).optional(),
        allergies: z.array(z.string().max(100)).optional(),
        notes: z.string().max(2000).optional(),
        isVip: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate email or phone
      if (input.email) {
        const existing = await ctx.prisma.customer.findFirst({
          where: { email: input.email, restaurantId: ctx.restaurantId },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A customer with this email already exists",
          });
        }
      }

      if (input.phone) {
        const existing = await ctx.prisma.customer.findFirst({
          where: { phone: input.phone, restaurantId: ctx.restaurantId },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A customer with this phone number already exists",
          });
        }
      }

      const customer = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            dietaryRequirements: input.dietaryRequirements,
            allergies: input.allergies ?? [],
            notes: input.notes,
            isVip: input.isVip ?? false,
            restaurantId: ctx.restaurantId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "customer.create",
            entityType: "Customer",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              firstName: input.firstName,
              lastName: input.lastName,
            },
          },
        });

        return created;
      });

      return customer;
    }),

  update: hostProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().max(100).nullable().optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().min(1).max(30).nullable().optional(),
        dietaryRequirements: z.string().max(500).nullable().optional(),
        allergies: z.array(z.string().max(100)).optional(),
        notes: z.string().max(2000).nullable().optional(),
        favouriteTableId: z.string().cuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const existing = await ctx.prisma.customer.findFirst({
        where: { id, restaurantId: ctx.restaurantId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      // Check uniqueness if email or phone is changing
      if (updates.email && updates.email !== existing.email) {
        const dup = await ctx.prisma.customer.findFirst({
          where: {
            email: updates.email,
            restaurantId: ctx.restaurantId,
            id: { not: id },
          },
        });
        if (dup) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A customer with this email already exists",
          });
        }
      }

      if (updates.phone && updates.phone !== existing.phone) {
        const dup = await ctx.prisma.customer.findFirst({
          where: {
            phone: updates.phone,
            restaurantId: ctx.restaurantId,
            id: { not: id },
          },
        });
        if (dup) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A customer with this phone number already exists",
          });
        }
      }

      const customer = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.customer.update({
          where: { id },
          data: {
            ...(updates.firstName !== undefined && { firstName: updates.firstName }),
            ...(updates.lastName !== undefined && { lastName: updates.lastName }),
            ...(updates.email !== undefined && { email: updates.email }),
            ...(updates.phone !== undefined && { phone: updates.phone }),
            ...(updates.dietaryRequirements !== undefined && {
              dietaryRequirements: updates.dietaryRequirements,
            }),
            ...(updates.allergies !== undefined && { allergies: updates.allergies }),
            ...(updates.notes !== undefined && { notes: updates.notes }),
            ...(updates.favouriteTableId !== undefined && {
              favouriteTableId: updates.favouriteTableId,
            }),
          },
        });

        await tx.auditLog.create({
          data: {
            action: "customer.update",
            entityType: "Customer",
            entityId: id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { changes: updates },
          },
        });

        return updated;
      });

      return customer;
    }),

  merge: hostProcedure
    .input(
      z.object({
        keepId: z.string().cuid(),
        mergeId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.keepId === input.mergeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot merge a customer with itself",
        });
      }

      const [keep, merge] = await Promise.all([
        ctx.prisma.customer.findFirst({
          where: { id: input.keepId, restaurantId: ctx.restaurantId },
        }),
        ctx.prisma.customer.findFirst({
          where: { id: input.mergeId, restaurantId: ctx.restaurantId },
        }),
      ]);

      if (!keep || !merge) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or both customers not found",
        });
      }

      const customer = await ctx.prisma.$transaction(async (tx) => {
        // Move all reservations from merge -> keep
        await tx.reservation.updateMany({
          where: { customerId: input.mergeId },
          data: { customerId: input.keepId },
        });

        // Move all waitlist entries from merge -> keep
        await tx.waitlistEntry.updateMany({
          where: { customerId: input.mergeId },
          data: { customerId: input.keepId },
        });

        // Move customer notes from merge -> keep
        await tx.customerNote.updateMany({
          where: { customerId: input.mergeId },
          data: { customerId: input.keepId },
        });

        // Update the kept customer with the most recent contact info
        const mergedAllergies = [
          ...new Set([...keep.allergies, ...merge.allergies]),
        ];
        const mergedNotes = [keep.notes, merge.notes]
          .filter(Boolean)
          .join("\n---\n");

        const updated = await tx.customer.update({
          where: { id: input.keepId },
          data: {
            // Prefer non-null values
            email: keep.email ?? merge.email,
            phone: keep.phone ?? merge.phone,
            lastName: keep.lastName ?? merge.lastName,
            dietaryRequirements:
              keep.dietaryRequirements ?? merge.dietaryRequirements,
            allergies: mergedAllergies,
            notes: mergedNotes || null,
            isVip: keep.isVip || merge.isVip,
          },
        });

        // Delete the merged customer
        await tx.customer.delete({ where: { id: input.mergeId } });

        await tx.auditLog.create({
          data: {
            action: "customer.merge",
            entityType: "Customer",
            entityId: input.keepId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              mergedCustomerId: input.mergeId,
              mergedCustomerName: `${merge.firstName} ${merge.lastName ?? ""}`.trim(),
            },
          },
        });

        return updated;
      });

      return customer;
    }),

  toggleVip: hostProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.customer.update({
          where: { id: input.id },
          data: { isVip: !customer.isVip },
        });

        await tx.auditLog.create({
          data: {
            action: customer.isVip ? "customer.removeVip" : "customer.addVip",
            entityType: "Customer",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { isVip: !customer.isVip },
          },
        });

        return result;
      });

      return updated;
    }),

  blacklist: hostProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        blacklist: z.boolean(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const result = await tx.customer.update({
          where: { id: input.id },
          data: {
            isBlacklisted: input.blacklist,
            blacklistReason: input.blacklist ? (input.reason ?? null) : null,
          },
        });

        await tx.auditLog.create({
          data: {
            action: input.blacklist
              ? "customer.blacklist"
              : "customer.unblacklist",
            entityType: "Customer",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { reason: input.reason ?? null },
          },
        });

        return result;
      });

      return updated;
    }),

  addNote: hostProcedure
    .input(
      z.object({
        customerId: z.string().cuid(),
        text: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findFirst({
        where: { id: input.customerId, restaurantId: ctx.restaurantId },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const note = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.customerNote.create({
          data: {
            text: input.text,
            customerId: input.customerId,
            authorId: ctx.user.id,
          },
          include: {
            author: { select: { id: true, name: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            action: "customer.addNote",
            entityType: "Customer",
            entityId: input.customerId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { noteId: created.id },
          },
        });

        return created;
      });

      return note;
    }),
});
