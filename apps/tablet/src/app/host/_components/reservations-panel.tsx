"use client";

import * as React from "react";
import { format, startOfDay, isAfter, parseISO } from "date-fns";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Users, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button, Badge, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bites-rms/ui";
import type { LiveTableData } from "@bites-rms/types";

interface Props {
  restaurantId: string;
  tables: LiveTableData[];
  onSeatWalkIn: (tableId: string, name: string, partySize: number) => void;
  onSeatReservation: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
}

const STATUS_BORDER_COLORS: Record<string, string> = {
  PENDING: "border-l-yellow-500",
  CONFIRMED: "border-l-blue-500",
  SEATED: "border-l-orange-500",
  COMPLETED: "border-l-emerald-500",
  CANCELLED: "border-l-gray-400",
  NO_SHOW: "border-l-red-500",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  CONFIRMED: "default",
  SEATED: "secondary",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export function ReservationsPanel({ restaurantId, tables, onSeatWalkIn, onSeatReservation, onMarkNoShow }: Props) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const { data: reservations = [], refetch } = trpc.reservation.getByDate.useQuery(
    { date: today },
    { refetchInterval: 15_000 },
  );

  // Filter to upcoming (from now onwards) and non-cancelled, sorted by time
  const now = new Date();
  const upcomingReservations = React.useMemo(() => {
    return reservations
      .filter((r) => {
        if (r.status === "CANCELLED" || r.status === "COMPLETED") return false;
        // Show seated ones too, plus upcoming
        if (r.status === "SEATED") return true;
        // For non-seated, show if the reservation time is in the future or within 2 hours past
        const resTime = new Date(r.time);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        return isAfter(resTime, twoHoursAgo);
      })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [reservations, now]);

  // Pull-to-refresh via touch
  const touchStartY = React.useRef(0);
  const [refreshing, setRefreshing] = React.useState(false);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]!.clientY;
  }

  async function handleTouchEnd(e: React.TouchEvent) {
    const deltaY = e.changedTouches[0]!.clientY - touchStartY.current;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (deltaY > 80 && scrollTop <= 0) {
      setRefreshing(true);
      await refetch();
      setRefreshing(false);
    }
  }

  const availableTables = tables.filter((t) => t.status === "AVAILABLE");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <h2 className="text-lg font-bold">Reservations</h2>
        <Button
          className="h-12 gap-2 text-sm font-semibold"
          onClick={() => setShowWalkIn(!showWalkIn)}
        >
          <Plus className="h-4 w-4" />
          Walk-in
        </Button>
      </div>

      {/* Walk-in quick form */}
      {showWalkIn && (
        <WalkInForm
          tables={availableTables}
          onSeat={(tableId, name, size) => {
            onSeatWalkIn(tableId, name, size);
            setShowWalkIn(false);
            toast.success("Walk-in seated");
          }}
          onCancel={() => setShowWalkIn(false)}
        />
      )}

      {/* Refreshing indicator */}
      {refreshing && (
        <div className="flex justify-center py-2 bg-muted/50 shrink-0">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Reservation list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        {upcomingReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No upcoming reservations</p>
          </div>
        ) : (
          <div className="divide-y">
            {upcomingReservations.map((res) => {
              const isExpanded = expandedId === res.id;
              const customerName = res.customer
                ? `${res.customer.firstName} ${res.customer.lastName}`
                : "Guest";

              return (
                <div
                  key={res.id}
                  className={`border-l-4 ${STATUS_BORDER_COLORS[res.status] ?? "border-l-gray-300"}`}
                >
                  {/* Summary row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : res.id)}
                  >
                    <span className="text-lg font-bold tabular-nums w-14 shrink-0">
                      {format(new Date(res.time), "HH:mm")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        Party of {res.partySize}
                        {res.table ? ` · ${res.table.name ?? `T${res.table.number}`}` : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[res.status] ?? "outline"} className="shrink-0 text-xs">
                      {res.status}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 bg-muted/30">
                      {res.specialRequests && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Notes:</span> {res.specialRequests}
                        </p>
                      )}
                      {res.customer?.phone && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Phone:</span> {res.customer.phone}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {(res.status === "CONFIRMED" || res.status === "PENDING") && (
                          <>
                            <Button
                              className="flex-1 h-12 text-sm font-semibold"
                              onClick={() => {
                                onSeatReservation(res.id);
                                setExpandedId(null);
                                toast.success(`${customerName} seated`);
                              }}
                            >
                              Seat Party
                            </Button>
                            <Button
                              variant="outline"
                              className="h-12 text-sm"
                              onClick={() => {
                                onMarkNoShow(res.id);
                                setExpandedId(null);
                                toast.info("Marked as no-show");
                              }}
                            >
                              No-Show
                            </Button>
                          </>
                        )}
                        {res.status === "SEATED" && (
                          <p className="text-sm text-muted-foreground italic">
                            Currently seated
                            {res.seatedAt
                              ? ` since ${format(new Date(res.seatedAt), "HH:mm")}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Walk-in Quick Form ──────────────────────────────────────────────────────

interface WalkInFormProps {
  tables: LiveTableData[];
  onSeat: (tableId: string, name: string, partySize: number) => void;
  onCancel: () => void;
}

function WalkInForm({ tables, onSeat, onCancel }: WalkInFormProps) {
  const [name, setName] = React.useState("");
  const [partySize, setPartySize] = React.useState(2);
  const [selectedTableId, setSelectedTableId] = React.useState("");

  // Filter tables that fit the party
  const suitableTables = tables.filter((t) => t.maxCovers >= partySize);

  return (
    <div className="border-b bg-card p-4 space-y-3 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="text-xs">Guest Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base"
            placeholder="Name"
            autoFocus
          />
        </div>
        <div className="w-24">
          <Label className="text-xs">Party</Label>
          <div className="flex items-center h-12 border rounded-md">
            <button
              className="flex-1 h-full text-xl font-bold active:bg-muted/50"
              onClick={() => setPartySize(Math.max(1, partySize - 1))}
            >
              −
            </button>
            <span className="w-8 text-center font-bold text-lg">{partySize}</span>
            <button
              className="flex-1 h-full text-xl font-bold active:bg-muted/50"
              onClick={() => setPartySize(Math.min(20, partySize + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Assign Table</Label>
        <Select value={selectedTableId} onValueChange={setSelectedTableId}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select a table..." />
          </SelectTrigger>
          <SelectContent>
            {suitableTables.length === 0 ? (
              <SelectItem value="_none" disabled>
                No available tables
              </SelectItem>
            ) : (
              suitableTables.map((t) => (
                <SelectItem key={t.tableId} value={t.tableId}>
                  {t.name ?? `Table ${t.number}`} ({t.minCovers}–{t.maxCovers} covers)
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 h-12 text-sm font-semibold"
          disabled={!name.trim() || !selectedTableId}
          onClick={() => onSeat(selectedTableId, name.trim(), partySize)}
        >
          Seat Walk-in
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
