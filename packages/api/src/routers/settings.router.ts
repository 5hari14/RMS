import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createRouter,
  protectedProcedure,
  managerProcedure,
  ownerProcedure,
} from "../trpc";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const settingsRouter = createRouter({
  // ─── General ────────────────────────────────────────────────────────────────

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
        cuisineType: true,
        priceRange: true,
        enableEmailConfirmations: true,
        enableSmsConfirmations: true,
        enableReminders: true,
        reminderTiming: true,
        customConfirmationMsg: true,
        defaultDurationMinutes: true,
        slotIntervalMinutes: true,
        maxAdvanceDays: true,
        minPartySize: true,
        maxPartySize: true,
        onlineBookingCapacity: true,
        autoConfirmOnlineBookings: true,
        noShowGracePeriodMinutes: true,
      },
    });

    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
    }

    return restaurant;
  }),

  updateGeneral: managerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        phone: z.string().max(30).nullable().optional(),
        email: z.string().email().nullable().optional(),
        website: z.string().url().nullable().optional(),
        address: z.string().max(200).nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        state: z.string().max(100).nullable().optional(),
        postcode: z.string().max(20).nullable().optional(),
        country: z.string().max(100).nullable().optional(),
        cuisineType: z.string().max(50).nullable().optional(),
        priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).nullable().optional(),
        timezone: z.string().max(50).optional(),
        currency: z.enum(["EUR", "GBP", "USD"]).optional(),
        logoUrl: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.restaurant.update({
          where: { id: ctx.restaurantId },
          data: input,
        });

        await tx.auditLog.create({
          data: {
            action: "settings.updateGeneral",
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

  // ─── Operating Hours ────────────────────────────────────────────────────────

  getOperatingHours: protectedProcedure.query(async ({ ctx }) => {
    const hours = await ctx.prisma.operatingHours.findMany({
      where: { restaurantId: ctx.restaurantId },
      orderBy: [{ dayOfWeek: "asc" }, { label: "asc" }],
    });

    return hours;
  }),

  upsertOperatingHours: managerProcedure
    .input(
      z.object({
        hours: z.array(
          z.object({
            dayOfWeek: dayOfWeekEnum,
            label: z.string().min(1).max(30).default("default"),
            openTime: z.string().regex(/^\d{2}:\d{2}$/),
            closeTime: z.string().regex(/^\d{2}:\d{2}$/),
            isClosed: z.boolean().default(false),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Delete all existing hours for this restaurant
        await tx.operatingHours.deleteMany({
          where: { restaurantId: ctx.restaurantId },
        });

        // Create all new hours
        const created = await tx.operatingHours.createMany({
          data: input.hours.map((h) => ({
            ...h,
            restaurantId: ctx.restaurantId,
          })),
        });

        await tx.auditLog.create({
          data: {
            action: "settings.upsertOperatingHours",
            entityType: "OperatingHours",
            entityId: ctx.restaurantId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { count: created.count },
          },
        });

        return created;
      });

      return result;
    }),

  // ─── Special Dates ──────────────────────────────────────────────────────────

  getSpecialDates: protectedProcedure.query(async ({ ctx }) => {
    const dates = await ctx.prisma.specialDate.findMany({
      where: { restaurantId: ctx.restaurantId },
      orderBy: { date: "asc" },
    });

    return dates;
  }),

  createSpecialDate: managerProcedure
    .input(
      z.object({
        date: z.string(), // ISO date string
        name: z.string().min(1).max(100),
        isClosed: z.boolean().default(false),
        openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        description: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.specialDate.create({
          data: {
            date: new Date(input.date),
            name: input.name,
            isClosed: input.isClosed,
            openTime: input.openTime ?? null,
            closeTime: input.closeTime ?? null,
            description: input.description ?? null,
            restaurantId: ctx.restaurantId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "settings.createSpecialDate",
            entityType: "SpecialDate",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: input,
          },
        });

        return created;
      });

      return result;
    }),

  deleteSpecialDate: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.specialDate.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Special date not found" });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.specialDate.delete({ where: { id: input.id } });

        await tx.auditLog.create({
          data: {
            action: "settings.deleteSpecialDate",
            entityType: "SpecialDate",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { name: existing.name, date: existing.date },
          },
        });
      });

      return { success: true };
    }),

  // ─── Reservation Settings ───────────────────────────────────────────────────

  updateReservationSettings: managerProcedure
    .input(
      z.object({
        defaultDurationMinutes: z.number().int().min(30).max(300).optional(),
        slotIntervalMinutes: z.number().int().min(5).max(60).optional(),
        maxAdvanceDays: z.number().int().min(1).max(90).optional(),
        minPartySize: z.number().int().min(1).max(50).optional(),
        maxPartySize: z.number().int().min(1).max(50).optional(),
        onlineBookingCapacity: z.number().int().min(0).max(100).optional(),
        autoConfirmOnlineBookings: z.boolean().optional(),
        noShowGracePeriodMinutes: z.number().int().min(0).max(60).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.restaurant.update({
          where: { id: ctx.restaurantId },
          data: input,
          select: {
            defaultDurationMinutes: true,
            slotIntervalMinutes: true,
            maxAdvanceDays: true,
            minPartySize: true,
            maxPartySize: true,
            onlineBookingCapacity: true,
            autoConfirmOnlineBookings: true,
            noShowGracePeriodMinutes: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "settings.updateReservationSettings",
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

  // ─── Notification Settings ──────────────────────────────────────────────────

  updateNotificationSettings: managerProcedure
    .input(
      z.object({
        enableEmailConfirmations: z.boolean().optional(),
        enableSmsConfirmations: z.boolean().optional(),
        enableReminders: z.boolean().optional(),
        reminderTiming: z.enum(["24h", "2h", "both"]).optional(),
        customConfirmationMsg: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.restaurant.update({
          where: { id: ctx.restaurantId },
          data: input,
          select: {
            enableEmailConfirmations: true,
            enableSmsConfirmations: true,
            enableReminders: true,
            reminderTiming: true,
            customConfirmationMsg: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "settings.updateNotificationSettings",
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

  // ─── Staff / Team ───────────────────────────────────────────────────────────

  getStaffMembers: managerProcedure.query(async ({ ctx }) => {
    const staff = await ctx.prisma.user.findMany({
      where: { restaurantId: ctx.restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return staff;
  }),

  inviteStaffMember: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        role: z.enum(["MANAGER", "HOST", "STAFF"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already in use at this restaurant
      const existing = await ctx.prisma.user.findFirst({
        where: { email: input.email, restaurantId: ctx.restaurantId },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A staff member with this email already exists",
        });
      }

      const result = await ctx.prisma.$transaction(async (tx) => {
        // Create user with a temporary password hash (invitation flow)
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            role: input.role,
            passwordHash: "PENDING_INVITATION",
            restaurantId: ctx.restaurantId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "settings.inviteStaffMember",
            entityType: "User",
            entityId: user.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { name: input.name, email: input.email, role: input.role },
          },
        });

        return user;
      });

      return result;
    }),

  updateStaffRole: ownerProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["MANAGER", "HOST", "STAFF"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findFirst({
        where: { id: input.userId, restaurantId: ctx.restaurantId },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });
      }

      if (target.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the owner's role",
        });
      }

      const result = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: input.userId },
          data: { role: input.role },
          select: { id: true, name: true, email: true, role: true, isActive: true },
        });

        await tx.auditLog.create({
          data: {
            action: "settings.updateStaffRole",
            entityType: "User",
            entityId: input.userId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { previousRole: target.role, newRole: input.role },
          },
        });

        return updated;
      });

      return result;
    }),

  toggleStaffActive: ownerProcedure
    .input(
      z.object({
        userId: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findFirst({
        where: { id: input.userId, restaurantId: ctx.restaurantId },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });
      }

      if (target.id === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot deactivate your own account",
        });
      }

      if (target.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot deactivate the owner account",
        });
      }

      const result = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: input.userId },
          data: { isActive: input.isActive },
          select: { id: true, name: true, email: true, role: true, isActive: true },
        });

        await tx.auditLog.create({
          data: {
            action: input.isActive
              ? "settings.reactivateStaff"
              : "settings.deactivateStaff",
            entityType: "User",
            entityId: input.userId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { isActive: input.isActive },
          },
        });

        return updated;
      });

      return result;
    }),

  // ─── Booking Widget ─────────────────────────────────────────────────────────

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
