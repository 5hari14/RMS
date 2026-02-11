import { z } from "zod";

export const reservationFormSchema = z.object({
  date: z.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Select a time"),
  partySize: z.number().int().min(1, "Min 1").max(20, "Max 20"),
  duration: z.number().int().min(15).max(480),
  source: z.enum([
    "PHONE",
    "WEBSITE",
    "BITES_APP",
    "WALK_IN",
    "GOOGLE",
    "FACEBOOK",
    "INSTAGRAM",
  ]),
  tableId: z.string().nullable(),
  specialRequests: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  tags: z.array(z.string()),

  // Customer - either existing or new
  customerId: z.string().nullable(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
});

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;

export function getDefaultValues(mode: "create" | "edit", reservation?: {
  date: Date | string;
  time: Date | string;
  partySize: number;
  duration: number;
  source: string;
  specialRequests: string | null;
  internalNotes: string | null;
  table: { id: string } | null;
  customer: { id: string } | null;
  tags: { label: string }[];
}, defaultDate?: Date): ReservationFormValues {
  if (mode === "edit" && reservation) {
    const time = new Date(reservation.time);
    const hh = time.getHours().toString().padStart(2, "0");
    const mm = time.getMinutes().toString().padStart(2, "0");
    return {
      date: new Date(reservation.date),
      time: `${hh}:${mm}`,
      partySize: reservation.partySize,
      duration: reservation.duration,
      source: reservation.source as ReservationFormValues["source"],
      tableId: reservation.table?.id ?? null,
      specialRequests: reservation.specialRequests ?? "",
      internalNotes: reservation.internalNotes ?? "",
      tags: reservation.tags.map((t) => t.label),
      customerId: reservation.customer?.id ?? null,
      customerName: undefined,
      customerEmail: undefined,
      customerPhone: undefined,
    };
  }

  return {
    date: defaultDate ?? new Date(),
    time: "19:00",
    partySize: 2,
    duration: 120,
    source: "PHONE",
    tableId: null,
    specialRequests: "",
    internalNotes: "",
    tags: [],
    customerId: null,
    customerName: undefined,
    customerEmail: undefined,
    customerPhone: undefined,
  };
}
