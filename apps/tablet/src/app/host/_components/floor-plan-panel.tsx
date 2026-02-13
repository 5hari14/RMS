"use client";

import * as React from "react";
import { format, differenceInMinutes } from "date-fns";
import type { LiveTableData, LiveTableStatus } from "@bites-rms/types";
import { Button, Input, Badge } from "@bites-rms/ui";

const CANVAS_W = 2000;
const CANVAS_H = 1400;

const STATUS_COLORS: Record<LiveTableStatus, string> = {
  AVAILABLE: "hsl(145 60% 42%)",
  RESERVED: "hsl(215 70% 55%)",
  SEATED: "hsl(30 85% 52%)",
  LATE: "hsl(0 72% 51%)",
  BLOCKED: "hsl(220 10% 58%)",
};

interface FloorPlan {
  id: string;
  name: string;
}

interface Props {
  tables: LiveTableData[];
  isLoading: boolean;
  floorPlans: FloorPlan[];
  selectedFloorPlanId: string | null;
  onSelectFloorPlan: (id: string) => void;
  onSeatWalkIn: (tableId: string, name: string, partySize: number) => void;
  onBlockTable: (tableId: string) => void;
  onUnblockTable: (tableId: string) => void;
  onSeatReservation: (reservationId: string) => void;
  onCompleteReservation: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
}

export function FloorPlanPanel({
  tables,
  isLoading,
  floorPlans,
  selectedFloorPlanId,
  onSelectFloorPlan,
  onSeatWalkIn,
  onBlockTable,
  onUnblockTable,
  onSeatReservation,
  onCompleteReservation,
  onMarkNoShow,
}: Props) {
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => new Date());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(0.5);

  // Tick every 30s
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fit zoom to container
  React.useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const scaleX = width / CANVAS_W;
      const scaleY = height / CANVAS_H;
      setZoom(Math.min(scaleX, scaleY) * 0.9);
    }
  }, [tables]);

  const selectedTable = tables.find((t) => t.tableId === selectedTableId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (floorPlans.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground p-6">
        <p>No floor plans configured. Set up a floor plan in the web dashboard.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Floor Plan</h2>
          {floorPlans.length > 1 && (
            <select
              value={selectedFloorPlanId ?? ""}
              onChange={(e) => onSelectFloorPlan(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {floorPlans.map((fp) => (
                <option key={fp.id} value={fp.id}>
                  {fp.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <LegendDot color="bg-emerald-500" label="Open" />
          <LegendDot color="bg-blue-500" label="Reserved" />
          <LegendDot color="bg-orange-500" label="Seated" />
          <LegendDot color="bg-red-500" label="Late" />
          <LegendDot color="bg-gray-400" label="Blocked" />
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/20 relative"
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
            setSelectedTableId(null);
          }
        }}
      >
        <div
          data-canvas="true"
          style={{
            width: CANVAS_W * zoom,
            height: CANVAS_H * zoom,
            position: "relative",
            margin: "0 auto",
          }}
        >
          {tables.map((table) => (
            <TabletTableShape
              key={table.tableId}
              table={table}
              zoom={zoom}
              isSelected={selectedTableId === table.tableId}
              onSelect={setSelectedTableId}
              now={now}
            />
          ))}

          {/* Action popup */}
          {selectedTable && (
            <TabletTablePopup
              table={selectedTable}
              zoom={zoom}
              now={now}
              onClose={() => setSelectedTableId(null)}
              onSeatWalkIn={onSeatWalkIn}
              onBlockTable={onBlockTable}
              onUnblockTable={onUnblockTable}
              onSeatReservation={onSeatReservation}
              onCompleteReservation={onCompleteReservation}
              onMarkNoShow={onMarkNoShow}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table Shape ──────────────────────────────────────────────────────────────

function TabletTableShape({
  table,
  zoom,
  isSelected,
  onSelect,
  now,
}: {
  table: LiveTableData;
  zoom: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  now: Date;
}) {
  const w = table.width * zoom;
  const h = table.height * zoom;
  const x = table.x * zoom;
  const y = table.y * zoom;
  const baseFontSize = Math.max(10, 12 * zoom);

  const borderRadius =
    table.shape === "ROUND"
      ? "50%"
      : table.shape === "BAR"
        ? `${2 * zoom}px`
        : `${6 * zoom}px`;

  const infoLines: string[] = [];
  if (table.status === "AVAILABLE") {
    infoLines.push(`${table.minCovers}–${table.maxCovers}`);
  } else if (table.status === "BLOCKED") {
    infoLines.push("Blocked");
  } else if (table.reservation) {
    const shortName =
      table.reservation.guestName.length > 10
        ? table.reservation.guestName.slice(0, 9) + "\u2026"
        : table.reservation.guestName;

    if (table.status === "SEATED" && table.reservation.seatedAt) {
      const mins = differenceInMinutes(now, new Date(table.reservation.seatedAt));
      infoLines.push(`${shortName}`);
      infoLines.push(`${mins}m`);
    } else {
      const timeStr = format(new Date(table.reservation.time), "HH:mm");
      infoLines.push(shortName);
      infoLines.push(timeStr);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(table.tableId)}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius,
        background: STATUS_COLORS[table.status],
        border: isSelected
          ? `${3 * zoom}px solid hsl(var(--ring))`
          : `${1 * zoom}px solid rgba(255,255,255,0.3)`,
        boxShadow: isSelected
          ? `0 0 0 ${4 * zoom}px hsl(var(--ring) / 0.3)`
          : `0 ${1 * zoom}px ${4 * zoom}px rgba(0,0,0,0.2)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
        color: "#fff",
        transition: "box-shadow 0.15s, border 0.15s",
        zIndex: isSelected ? 10 : 1,
        minWidth: 48,
        minHeight: 48,
        touchAction: "manipulation",
      }}
    >
      <span style={{ fontSize: baseFontSize, fontWeight: 700, lineHeight: 1.2, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
        {table.name ?? `T${table.number}`}
      </span>
      {infoLines.map((line, i) => (
        <span
          key={i}
          style={{
            fontSize: baseFontSize * 0.75,
            lineHeight: 1.2,
            opacity: 0.95,
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}

// ─── Table Action Popup (touch-optimised) ─────────────────────────────────────

function TabletTablePopup({
  table,
  zoom,
  now,
  onClose,
  onSeatWalkIn,
  onBlockTable,
  onUnblockTable,
  onSeatReservation,
  onCompleteReservation,
  onMarkNoShow,
}: {
  table: LiveTableData;
  zoom: number;
  now: Date;
  onClose: () => void;
  onSeatWalkIn: (tableId: string, name: string, partySize: number) => void;
  onBlockTable: (tableId: string) => void;
  onUnblockTable: (tableId: string) => void;
  onSeatReservation: (reservationId: string) => void;
  onCompleteReservation: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
}) {
  const [walkInName, setWalkInName] = React.useState("");
  const [walkInSize, setWalkInSize] = React.useState(2);
  const [showWalkInForm, setShowWalkInForm] = React.useState(false);

  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  const centerX = (table.x + table.width / 2) * zoom;
  const centerY = (table.y + table.height) * zoom + 12;

  const statusLabel =
    table.status === "AVAILABLE" ? "Available"
      : table.status === "RESERVED" ? "Reserved"
      : table.status === "SEATED" ? "Seated"
      : table.status === "LATE" ? "Late"
      : "Blocked";

  return (
    <div
      ref={popupRef}
      className="w-80 rounded-2xl border bg-card shadow-2xl p-5 z-50"
      style={{
        position: "absolute",
        left: Math.max(0, centerX - 160),
        top: centerY,
        touchAction: "manipulation",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold">{table.name ?? `Table ${table.number}`}</h3>
          <p className="text-xs text-muted-foreground">
            {statusLabel} · {table.minCovers}–{table.maxCovers} covers
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground p-2 rounded-lg active:bg-muted/50"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Reservation info */}
      {table.reservation && (
        <div className="mb-4 rounded-xl bg-muted/50 p-3 text-sm">
          <p className="font-medium">{table.reservation.guestName}</p>
          <p className="text-muted-foreground">
            Party of {table.reservation.partySize} · {format(new Date(table.reservation.time), "HH:mm")}
          </p>
          {table.status === "SEATED" && table.reservation.seatedAt && (
            <p className="text-muted-foreground">
              Seated {differenceInMinutes(now, new Date(table.reservation.seatedAt))} min ago
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {table.status === "AVAILABLE" && !showWalkInForm && (
          <>
            <Button
              className="w-full h-14 text-base font-semibold"
              onClick={() => setShowWalkInForm(true)}
            >
              Seat Walk-in
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={() => { onBlockTable(table.tableId); onClose(); }}
            >
              Block Table
            </Button>
          </>
        )}

        {table.status === "AVAILABLE" && showWalkInForm && (
          <>
            <Input
              placeholder="Guest name"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="h-14 text-base"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Party:</span>
              <div className="flex items-center gap-1">
                <button
                  className="h-12 w-12 rounded-lg border flex items-center justify-center text-xl font-bold active:bg-muted/50"
                  onClick={() => setWalkInSize(Math.max(1, walkInSize - 1))}
                >
                  −
                </button>
                <span className="w-10 text-center font-bold text-lg">{walkInSize}</span>
                <button
                  className="h-12 w-12 rounded-lg border flex items-center justify-center text-xl font-bold active:bg-muted/50"
                  onClick={() => setWalkInSize(Math.min(20, walkInSize + 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 h-14 text-base font-semibold"
                disabled={!walkInName.trim()}
                onClick={() => {
                  onSeatWalkIn(table.tableId, walkInName.trim(), walkInSize);
                  onClose();
                }}
              >
                Confirm
              </Button>
              <Button variant="outline" className="flex-1 h-14 text-base" onClick={() => setShowWalkInForm(false)}>
                Back
              </Button>
            </div>
          </>
        )}

        {(table.status === "RESERVED" || table.status === "LATE") && table.reservation && (
          <>
            <Button
              className="w-full h-14 text-base font-semibold"
              onClick={() => { onSeatReservation(table.reservation!.id); onClose(); }}
            >
              Seat Party
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={() => { onMarkNoShow(table.reservation!.id); onClose(); }}
            >
              Mark No-Show
            </Button>
          </>
        )}

        {table.status === "SEATED" && table.reservation && (
          <Button
            className="w-full h-14 text-base font-semibold"
            onClick={() => { onCompleteReservation(table.reservation!.id); onClose(); }}
          >
            Complete & Free Table
          </Button>
        )}

        {table.status === "BLOCKED" && (
          <Button
            className="w-full h-14 text-base font-semibold"
            onClick={() => { onUnblockTable(table.tableId); onClose(); }}
          >
            Unblock Table
          </Button>
        )}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
