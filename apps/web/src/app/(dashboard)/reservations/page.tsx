import { requireAuth } from "@/lib/require-auth";
import { ReservationsView } from "./_components/reservations-view";

export const metadata = {
  title: "Reservations | Bites RMS",
};

export default async function ReservationsPage() {
  await requireAuth();

  return <ReservationsView />;
}
