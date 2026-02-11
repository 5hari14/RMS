// ─────────────────────────────────────────────────────────────────────────────
// Live table status types — shared between API and frontend
// ─────────────────────────────────────────────────────────────────────────────

export type LiveTableStatus = "AVAILABLE" | "RESERVED" | "SEATED" | "LATE" | "BLOCKED";

export interface LiveReservationInfo {
  id: string;
  guestName: string;
  partySize: number;
  time: string;
  seatedAt?: string;
}

export interface LiveTableData {
  tableId: string;
  dbId: string;
  number: number;
  name: string | null;
  minCovers: number;
  maxCovers: number;
  shape: "ROUND" | "SQUARE" | "RECTANGULAR" | "BAR";
  section: "INDOOR" | "OUTDOOR" | "TERRACE" | "PRIVATE" | "BAR";
  x: number;
  y: number;
  width: number;
  height: number;
  isAccessible: boolean;
  status: LiveTableStatus;
  reservation?: LiveReservationInfo;
}

export interface LiveSummary {
  available: number;
  seated: number;
  seatedCovers: number;
  reservedNextHour: number;
  waitlist: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket event payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface TableStatusChangedPayload {
  tableId: string;
  status: LiveTableStatus;
  reservation?: LiveReservationInfo;
}

export interface ReservationUpdatedPayload {
  reservationId: string;
  tableId: string | null;
  status: string;
}

export interface ReservationCreatedPayload {
  reservationId: string;
  tableId: string | null;
  status: string;
  guestName: string;
  partySize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket event names
// ─────────────────────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  TABLE_STATUS_CHANGED: "table:statusChanged",
  RESERVATION_UPDATED: "reservation:updated",
  RESERVATION_CREATED: "reservation:created",
  FLOOR_PLAN_REFRESH: "floorPlan:refresh",
  JOIN_RESTAURANT: "join:restaurant",
  LEAVE_RESTAURANT: "leave:restaurant",
} as const;
