import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Enum schemas
// ─────────────────────────────────────────────────────────────────────────────

export const reservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const reservationSourceSchema = z.enum([
  "PHONE",
  "WEBSITE",
  "BITES_APP",
  "WALK_IN",
  "GOOGLE",
  "FACEBOOK",
  "INSTAGRAM",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Query schemas
// ─────────────────────────────────────────────────────────────────────────────

export const getByIdSchema = z.object({
  id: z.string().cuid(),
});

export const getByDateSchema = z.object({
  date: z.coerce.date(),
});

export const getByDateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const getByCustomerSchema = z.object({
  customerId: z.string().cuid(),
});

export const getUpcomingSchema = z.object({
  days: z.number().int().min(1).max(90).default(7),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createReservationSchema = z
  .object({
    date: z.coerce.date(),
    time: z.coerce.date(),
    partySize: z.number().int().min(1).max(20),
    duration: z.number().int().min(15).max(480).optional(),
    source: reservationSourceSchema,

    // Link existing customer or provide details for new/lookup
    customerId: z.string().cuid().optional(),
    customerName: z.string().min(1).max(200).optional(),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().min(1).max(30).optional(),

    tableId: z.string().cuid().optional(),
    specialRequests: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),
    tags: z.array(z.string().min(1).max(50)).optional(),
  })
  .refine(
    (data) =>
      data.customerId || data.customerName,
    { message: "Either customerId or customerName is required" },
  );

export const updateReservationSchema = z.object({
  id: z.string().cuid(),
  date: z.coerce.date().optional(),
  time: z.coerce.date().optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  duration: z.number().int().min(15).max(480).optional(),
  tableId: z.string().cuid().nullable().optional(),
  specialRequests: z.string().max(2000).nullable().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const updateStatusSchema = z.object({
  id: z.string().cuid(),
  status: reservationStatusSchema,
});

export const cancelSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

export const assignTableSchema = z.object({
  id: z.string().cuid(),
  tableId: z.string().cuid(),
});
