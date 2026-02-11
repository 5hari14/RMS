"use client";

import * as React from "react";
import { startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@bites-rms/ui";
import { trpc } from "@/trpc/client";

import { DateNav } from "./date-nav";
import { SummaryBar } from "./summary-bar";
import { FilterBar } from "./filter-bar";
import { ReservationTable } from "./reservation-table";
import { ReservationDetailPanel } from "./reservation-detail-panel";
import { CreateReservationPanel } from "./create-reservation-panel";
import type { Reservation } from "./types";

export function ReservationsView() {
  const [selectedDate, setSelectedDate] = React.useState(() => startOfDay(new Date()));
  const [selectedReservation, setSelectedReservation] = React.useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch reservations for selected date
  const { data: reservations = [], refetch } = trpc.reservation.getByDate.useQuery(
    { date: selectedDate },
    { refetchInterval: 30_000 },
  );

  // Filter reservations client-side
  const filteredReservations = React.useMemo(() => {
    let filtered = reservations as Reservation[];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Period filter
    if (periodFilter !== "all") {
      filtered = filtered.filter((r) => {
        const hour = new Date(r.time).getHours();
        if (periodFilter === "lunch") return hour >= 11 && hour < 15;
        if (periodFilter === "dinner") return hour >= 17 && hour <= 23;
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        if (!r.customer) return false;
        const name = `${r.customer.firstName} ${r.customer.lastName ?? ""}`.toLowerCase();
        return name.includes(q);
      });
    }

    return filtered;
  }, [reservations, statusFilter, periodFilter, searchQuery]);

  // Compute summary stats from ALL reservations (not filtered)
  const summary = React.useMemo(() => {
    const all = reservations as Reservation[];
    return {
      totalBookings: all.length,
      totalCovers: all.reduce((sum, r) => sum + r.partySize, 0),
      confirmed: all.filter((r) => r.status === "CONFIRMED").length,
      seated: all.filter((r) => r.status === "SEATED").length,
      noShows: all.filter((r) => r.status === "NO_SHOW").length,
      pending: all.filter((r) => r.status === "PENDING").length,
    };
  }, [reservations]);

  function handleRowClick(reservation: Reservation) {
    setSelectedReservation(reservation);
    setDetailOpen(true);
  }

  function handleStatusUpdate() {
    refetch();
    setDetailOpen(false);
    setSelectedReservation(null);
  }

  function handleCreated() {
    refetch();
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header row: date nav + new reservation button */}
      <div className="flex items-center justify-between">
        <DateNav date={selectedDate} onDateChange={setSelectedDate} />
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Reservation
        </Button>
      </div>

      {/* Summary bar */}
      <SummaryBar {...summary} />

      {/* Filter bar */}
      <FilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Reservation table */}
      <ReservationTable reservations={filteredReservations} onRowClick={handleRowClick} />

      {/* Detail slide-over */}
      <ReservationDetailPanel
        reservation={selectedReservation}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedReservation(null);
        }}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Create slide-over */}
      <CreateReservationPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        defaultDate={selectedDate}
      />
    </div>
  );
}
