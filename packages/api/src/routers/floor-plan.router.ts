import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, protectedProcedure, managerProcedure } from "../trpc";

const tableShapeSchema = z.enum(["ROUND", "SQUARE", "RECTANGULAR", "BAR"]);
const tableSectionSchema = z.enum([
  "INDOOR",
  "OUTDOOR",
  "TERRACE",
  "PRIVATE",
  "BAR",
]);

const tableInputSchema = z.object({
  id: z.string().cuid().optional(), // present for existing tables
  number: z.number().int().min(1),
  name: z.string().max(50).nullable().optional(),
  minCovers: z.number().int().min(1).default(1),
  maxCovers: z.number().int().min(1),
  shape: tableShapeSchema,
  section: tableSectionSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().min(20),
  height: z.number().min(20),
  isActive: z.boolean().default(true),
  isAccessible: z.boolean().default(false),
  hasHighChair: z.boolean().default(false),
});

export const floorPlanRouter = createRouter({
  // ─── Queries ──────────────────────────────────────────────────────────

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.floorPlan.findMany({
      where: { restaurantId: ctx.restaurantId },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        _count: { select: { tables: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.prisma.floorPlan.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
        include: {
          tables: {
            orderBy: { number: "asc" },
          },
        },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Floor plan not found",
        });
      }

      return plan;
    }),

  // ─── Mutations ────────────────────────────────────────────────────────

  create: managerProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.floorPlan.create({
          data: {
            name: input.name,
            restaurantId: ctx.restaurantId,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "floorPlan.create",
            entityType: "FloorPlan",
            entityId: created.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { name: input.name },
          },
        });

        return created;
      });

      return plan;
    }),

  rename: managerProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.floorPlan.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Floor plan not found",
        });
      }

      const plan = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.floorPlan.update({
          where: { id: input.id },
          data: { name: input.name },
        });

        await tx.auditLog.create({
          data: {
            action: "floorPlan.rename",
            entityType: "FloorPlan",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { from: existing.name, to: input.name },
          },
        });

        return updated;
      });

      return plan;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.floorPlan.findFirst({
        where: { id: input.id, restaurantId: ctx.restaurantId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Floor plan not found",
        });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.floorPlan.delete({ where: { id: input.id } });

        await tx.auditLog.create({
          data: {
            action: "floorPlan.delete",
            entityType: "FloorPlan",
            entityId: input.id,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: { name: existing.name },
          },
        });
      });

      return { success: true };
    }),

  /**
   * Bulk-save all tables for a floor plan.
   * Replaces the entire table set — creates new, updates existing,
   * deletes removed tables.
   */
  saveTables: managerProcedure
    .input(
      z.object({
        floorPlanId: z.string().cuid(),
        tables: z.array(tableInputSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.prisma.floorPlan.findFirst({
        where: { id: input.floorPlanId, restaurantId: ctx.restaurantId },
        include: { tables: { select: { id: true } } },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Floor plan not found",
        });
      }

      const existingIds = new Set(plan.tables.map((t) => t.id));
      const incomingIds = new Set(
        input.tables.filter((t) => t.id).map((t) => t.id!),
      );

      // IDs to delete: in existing but not incoming
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

      const result = await ctx.prisma.$transaction(async (tx) => {
        // Delete removed tables
        if (toDelete.length > 0) {
          await tx.table.deleteMany({
            where: { id: { in: toDelete }, floorPlanId: input.floorPlanId },
          });
        }

        const savedTables = [];

        for (const table of input.tables) {
          const data = {
            number: table.number,
            name: table.name ?? null,
            minCovers: table.minCovers,
            maxCovers: table.maxCovers,
            shape: table.shape,
            section: table.section,
            x: table.x,
            y: table.y,
            width: table.width,
            height: table.height,
            isActive: table.isActive,
            isAccessible: table.isAccessible,
            hasHighChair: table.hasHighChair,
          };

          if (table.id && existingIds.has(table.id)) {
            const updated = await tx.table.update({
              where: { id: table.id },
              data,
            });
            savedTables.push(updated);
          } else {
            const created = await tx.table.create({
              data: {
                ...data,
                floorPlanId: input.floorPlanId,
              },
            });
            savedTables.push(created);
          }
        }

        await tx.auditLog.create({
          data: {
            action: "floorPlan.saveTables",
            entityType: "FloorPlan",
            entityId: input.floorPlanId,
            userId: ctx.user.id,
            restaurantId: ctx.restaurantId,
            details: {
              tableCount: input.tables.length,
              deleted: toDelete.length,
            },
          },
        });

        return savedTables;
      });

      return result;
    }),
});
