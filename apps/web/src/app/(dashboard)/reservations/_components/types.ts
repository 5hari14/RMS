export interface Reservation {
  id: string;
  date: Date | string;
  time: Date | string;
  partySize: number;
  duration: number;
  status: string;
  source: string;
  specialRequests: string | null;
  internalNotes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    isVip: boolean;
    isBlacklisted: boolean;
    allergies: string[];
    dietaryRequirements: string | null;
  } | null;
  table: {
    id: string;
    number: number;
    name: string | null;
    section: string | null;
    minCovers: number;
    maxCovers: number;
  } | null;
  tags: { id: string; label: string }[];
  createdBy: { id: string; name: string | null } | null;
}

export type PanelMode = "view" | "edit" | "create";

export interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isVip: boolean;
  isBlacklisted: boolean;
  allergies: string[];
  dietaryRequirements: string | null;
  _count: { reservations: number };
}

export interface AvailableTable {
  id: string;
  number: number;
  name: string | null;
  section: string | null;
  minCovers: number;
  maxCovers: number;
}

export const TAG_OPTIONS = [
  "VIP",
  "Birthday",
  "Business Meeting",
  "First Time",
  "Anniversary",
  "Press",
  "Influencer",
] as const;

export const SOURCE_OPTIONS = [
  { value: "PHONE", label: "Phone" },
  { value: "WEBSITE", label: "Website" },
  { value: "BITES_APP", label: "Bites App" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "GOOGLE", label: "Google" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
] as const;

export const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  SEATED: {
    label: "Seated",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
  NO_SHOW: {
    label: "No-show",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};
