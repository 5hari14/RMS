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
