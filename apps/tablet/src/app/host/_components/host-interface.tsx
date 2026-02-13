"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import { useSocket } from "@/hooks/use-socket";
import type { TableStatusChangedPayload } from "@bites-rms/types";
import type { UserRole } from "@bites-rms/db";
import { ReservationsPanel } from "./reservations-panel";
import { FloorPlanPanel } from "./floor-plan-panel";
import { WaitlistPanel } from "./waitlist-panel";
import { BottomBar } from "./bottom-bar";

interface Props {
  restaurantId: string;
  restaurantName: string;
  userRole: UserRole;
}

export function HostInterface({ restaurantId, restaurantName, userRole }: Props) {
  const [darkMode, setDarkMode] = React.useState(false);
  const [selectedFloorPlanId, setSelectedFloorPlanId] = React.useState<string | null>(null);

  const utils = trpc.useUtils();

  // ─── Floor plan data ──────────────────────────────────────────────────
  const floorPlansQuery = trpc.floorPlan.list.useQuery();

  React.useEffect(() => {
    if (!selectedFloorPlanId && floorPlansQuery.data && floorPlansQuery.data.length > 0) {
      setSelectedFloorPlanId(floorPlansQuery.data[0]!.id);
    }
  }, [selectedFloorPlanId, floorPlansQuery.data]);

  const tablesQuery = trpc.liveTable.getStatus.useQuery(
    { floorPlanId: selectedFloorPlanId! },
    { enabled: !!selectedFloorPlanId, refetchInterval: 30_000 },
  );

  const summaryQuery = trpc.liveTable.getSummary.useQuery(
    { floorPlanId: selectedFloorPlanId! },
    { enabled: !!selectedFloorPlanId, refetchInterval: 30_000 },
  );

  // ─── Mutations ────────────────────────────────────────────────────────
  const invalidateAll = React.useCallback(() => {
    void utils.liveTable.getStatus.invalidate();
    void utils.liveTable.getSummary.invalidate();
    void utils.reservation.getByDate.invalidate();
  }, [utils]);

  const seatWalkInMutation = trpc.liveTable.seatWalkIn.useMutation({ onSuccess: invalidateAll });
  const blockTableMutation = trpc.liveTable.blockTable.useMutation({ onSuccess: invalidateAll });
  const unblockTableMutation = trpc.liveTable.unblockTable.useMutation({ onSuccess: invalidateAll });
  const seatReservationMutation = trpc.liveTable.seatReservation.useMutation({ onSuccess: invalidateAll });
  const completeReservationMutation = trpc.liveTable.completeReservation.useMutation({ onSuccess: invalidateAll });
  const markNoShowMutation = trpc.liveTable.markNoShow.useMutation({ onSuccess: invalidateAll });

  // ─── Socket.io real-time ──────────────────────────────────────────────
  const handleTableStatusChanged = React.useCallback(
    (payload: TableStatusChangedPayload) => {
      utils.liveTable.getStatus.setData(
        { floorPlanId: selectedFloorPlanId! },
        (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.tableId === payload.tableId
              ? { ...t, status: payload.status, reservation: payload.reservation }
              : t,
          );
        },
      );
      void utils.liveTable.getSummary.invalidate();
    },
    [selectedFloorPlanId, utils],
  );

  const handleRefresh = React.useCallback(() => {
    invalidateAll();
    void utils.waitlist.getActive.invalidate();
  }, [invalidateAll, utils]);

  useSocket({
    restaurantId,
    onTableStatusChanged: handleTableStatusChanged,
    onReservationCreated: handleRefresh,
    onReservationUpdated: handleRefresh,
    onFloorPlanRefresh: handleRefresh,
  });

  // ─── Dark mode ────────────────────────────────────────────────────────
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT: Reservations — 30% */}
        <div className="w-[30%] border-r flex flex-col min-h-0">
          <ReservationsPanel
            restaurantId={restaurantId}
            tables={tablesQuery.data ?? []}
            onSeatWalkIn={(tableId, name, size) =>
              seatWalkInMutation.mutate({ tableId, guestName: name, partySize: size })
            }
            onSeatReservation={(id) => seatReservationMutation.mutate({ reservationId: id })}
            onMarkNoShow={(id) => markNoShowMutation.mutate({ reservationId: id })}
          />
        </div>

        {/* CENTRE: Floor Plan — 45% */}
        <div className="w-[45%] border-r flex flex-col min-h-0">
          <FloorPlanPanel
            tables={tablesQuery.data ?? []}
            isLoading={tablesQuery.isLoading || floorPlansQuery.isLoading}
            floorPlans={floorPlansQuery.data ?? []}
            selectedFloorPlanId={selectedFloorPlanId}
            onSelectFloorPlan={setSelectedFloorPlanId}
            onSeatWalkIn={(tableId, name, size) =>
              seatWalkInMutation.mutate({ tableId, guestName: name, partySize: size })
            }
            onBlockTable={(id) => blockTableMutation.mutate({ tableId: id })}
            onUnblockTable={(id) => unblockTableMutation.mutate({ tableId: id })}
            onSeatReservation={(id) => seatReservationMutation.mutate({ reservationId: id })}
            onCompleteReservation={(id) => completeReservationMutation.mutate({ reservationId: id })}
            onMarkNoShow={(id) => markNoShowMutation.mutate({ reservationId: id })}
          />
        </div>

        {/* RIGHT: Waitlist — 25% */}
        <div className="w-[25%] flex flex-col min-h-0">
          <WaitlistPanel />
        </div>
      </div>

      {/* Bottom bar */}
      <BottomBar
        restaurantName={restaurantName}
        summary={summaryQuery.data}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />
    </div>
  );
}
