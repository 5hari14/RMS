"use client";

import * as React from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { useSocket } from "@/hooks/use-socket";
import type { LiveTableData, TableStatusChangedPayload } from "@bites-rms/types";
import { LiveSummaryBar } from "./live-summary-bar";
import { LiveCanvas } from "./live-canvas";
import { Minus, Plus, Pencil } from "lucide-react";
import { Button } from "@bites-rms/ui";

interface Props {
  restaurantId: string;
}

export function LiveFloorPlanView({ restaurantId }: Props) {
  const [selectedFloorPlanId, setSelectedFloorPlanId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(0.55);
  const [now, setNow] = React.useState(() => new Date());

  // Tick every 30s to update duration timers
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // ─── Data fetching ─────────────────────────────────────────────────────
  const floorPlansQuery = trpc.floorPlan.list.useQuery();
  const utils = trpc.useUtils();

  // Auto-select first floor plan
  React.useEffect(() => {
    if (!selectedFloorPlanId && floorPlansQuery.data && floorPlansQuery.data.length > 0) {
      setSelectedFloorPlanId(floorPlansQuery.data[0]!.id);
    }
  }, [selectedFloorPlanId, floorPlansQuery.data]);

  const tablesQuery = trpc.liveTable.getStatus.useQuery(
    { floorPlanId: selectedFloorPlanId! },
    {
      enabled: !!selectedFloorPlanId,
      refetchInterval: 30_000,
    },
  );

  const summaryQuery = trpc.liveTable.getSummary.useQuery(
    { floorPlanId: selectedFloorPlanId! },
    {
      enabled: !!selectedFloorPlanId,
      refetchInterval: 30_000,
    },
  );

  // ─── Mutations ─────────────────────────────────────────────────────────
  const seatWalkInMutation = trpc.liveTable.seatWalkIn.useMutation({
    onSuccess: () => {
      void utils.liveTable.getStatus.invalidate();
      void utils.liveTable.getSummary.invalidate();
    },
  });

  const blockTableMutation = trpc.liveTable.blockTable.useMutation({
    onSuccess: () => {
      void utils.liveTable.getStatus.invalidate();
      void utils.liveTable.getSummary.invalidate();
    },
  });

  const unblockTableMutation = trpc.liveTable.unblockTable.useMutation({
    onSuccess: () => {
      void utils.liveTable.getStatus.invalidate();
      void utils.liveTable.getSummary.invalidate();
    },
  });

  const seatReservationMutation = trpc.liveTable.seatReservation.useMutation({
    onSuccess: () => {
      void utils.liveTable.getStatus.invalidate();
      void utils.liveTable.getSummary.invalidate();
    },
  });

  const completeReservationMutation = trpc.liveTable.completeReservation.useMutation({
    onSuccess: () => {
      void utils.liveTable.getStatus.invalidate();
      void utils.liveTable.getSummary.invalidate();
    },
  });

  const markNoShowMutation = trpc.liveTable.markNoShow.useMutation({
    onSuccess: () => {
      void utils.liveTable.getStatus.invalidate();
      void utils.liveTable.getSummary.invalidate();
    },
  });

  // ─── Socket.io real-time updates ──────────────────────────────────────
  const handleTableStatusChanged = React.useCallback(
    (payload: TableStatusChangedPayload) => {
      // Optimistically update the local cache
      utils.liveTable.getStatus.setData(
        { floorPlanId: selectedFloorPlanId! },
        (old) => {
          if (!old) return old;
          return old.map((t) => {
            if (t.tableId !== payload.tableId) return t;
            return {
              ...t,
              status: payload.status,
              reservation: payload.reservation,
            };
          });
        },
      );
      // Also refetch summary
      void utils.liveTable.getSummary.invalidate();
    },
    [selectedFloorPlanId, utils],
  );

  const handleRefresh = React.useCallback(() => {
    void utils.liveTable.getStatus.invalidate();
    void utils.liveTable.getSummary.invalidate();
  }, [utils]);

  useSocket({
    restaurantId,
    onTableStatusChanged: handleTableStatusChanged,
    onReservationCreated: handleRefresh,
    onReservationUpdated: handleRefresh,
    onFloorPlanRefresh: handleRefresh,
  });

  // ─── Action handlers ──────────────────────────────────────────────────
  const handleSeatWalkIn = React.useCallback(
    (tableId: string, guestName: string, partySize: number) => {
      seatWalkInMutation.mutate({ tableId, guestName, partySize });
    },
    [seatWalkInMutation],
  );

  const handleBlockTable = React.useCallback(
    (tableId: string) => {
      blockTableMutation.mutate({ tableId });
    },
    [blockTableMutation],
  );

  const handleUnblockTable = React.useCallback(
    (tableId: string) => {
      unblockTableMutation.mutate({ tableId });
    },
    [unblockTableMutation],
  );

  const handleSeatReservation = React.useCallback(
    (reservationId: string) => {
      seatReservationMutation.mutate({ reservationId });
    },
    [seatReservationMutation],
  );

  const handleCompleteReservation = React.useCallback(
    (reservationId: string) => {
      completeReservationMutation.mutate({ reservationId });
    },
    [completeReservationMutation],
  );

  const handleMarkNoShow = React.useCallback(
    (reservationId: string) => {
      markNoShowMutation.mutate({ reservationId });
    },
    [markNoShowMutation],
  );

  // ─── Render ───────────────────────────────────────────────────────────

  if (floorPlansQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!floorPlansQuery.data || floorPlansQuery.data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-lg text-muted-foreground">No floor plans configured yet.</p>
        <Link href="/floor-plan">
          <Button>Go to Floor Plan Editor</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Live Floor Plan</h1>
          {floorPlansQuery.data.length > 1 && (
            <select
              value={selectedFloorPlanId ?? ""}
              onChange={(e) => setSelectedFloorPlanId(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {floorPlansQuery.data.map((fp) => (
                <option key={fp.id} value={fp.id}>
                  {fp.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Status legend */}
          <div className="hidden sm:flex items-center gap-2 ml-4 text-xs">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Available</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Reserved</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Seated</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Late</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" />Blocked</span>
          </div>

          <Link href="/floor-plan" className="ml-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Layout</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-4 py-2">
        <LiveSummaryBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
      </div>

      {/* Canvas */}
      {tablesQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <LiveCanvas
          tables={tablesQuery.data ?? []}
          zoom={zoom}
          now={now}
          onSeatWalkIn={handleSeatWalkIn}
          onBlockTable={handleBlockTable}
          onUnblockTable={handleUnblockTable}
          onSeatReservation={handleSeatReservation}
          onCompleteReservation={handleCompleteReservation}
          onMarkNoShow={handleMarkNoShow}
        />
      )}
    </div>
  );
}
