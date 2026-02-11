"use client";

import * as React from "react";
import { format, differenceInMinutes } from "date-fns";
import type { LiveTableData } from "@bites-rms/types";
import { Button } from "@bites-rms/ui";

interface Props {
  table: LiveTableData;
  now: Date;
  onClose: () => void;
  onSeatWalkIn: (tableId: string, guestName: string, partySize: number) => void;
  onBlockTable: (tableId: string) => void;
  onUnblockTable: (tableId: string) => void;
  onSeatReservation: (reservationId: string) => void;
  onCompleteReservation: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
}

export function TableActionPopup({
  table,
  now,
  onClose,
  onSeatWalkIn,
  onBlockTable,
  onUnblockTable,
  onSeatReservation,
  onCompleteReservation,
  onMarkNoShow,
}: Props) {
  const [walkInName, setWalkInName] = React.useState("");
  const [walkInSize, setWalkInSize] = React.useState(2);
  const [showWalkInForm, setShowWalkInForm] = React.useState(false);

  const popupRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSeatWalkIn = () => {
    if (!walkInName.trim()) return;
    onSeatWalkIn(table.tableId, walkInName.trim(), walkInSize);
    onClose();
  };

  const statusLabel = table.status === "AVAILABLE"
    ? "Available"
    : table.status === "RESERVED"
    ? "Reserved"
    : table.status === "SEATED"
    ? "Seated"
    : table.status === "LATE"
    ? "Late"
    : "Blocked";

  return (
    <div
      ref={popupRef}
      className="w-72 rounded-xl border bg-card shadow-xl p-4 z-50"
      style={{ touchAction: "manipulation" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold">
            {table.name ?? `Table ${table.number}`}
          </h3>
          <p className="text-xs text-muted-foreground">
            {statusLabel} &middot; {table.minCovers}-{table.maxCovers} covers
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Reservation info */}
      {table.reservation && (
        <div className="mb-3 rounded-lg bg-muted/50 p-2.5 text-sm">
          <p className="font-medium">{table.reservation.guestName}</p>
          <p className="text-muted-foreground">
            Party of {table.reservation.partySize} &middot;{" "}
            {format(new Date(table.reservation.time), "HH:mm")}
          </p>
          {table.status === "SEATED" && table.reservation.seatedAt && (
            <p className="text-muted-foreground">
              Seated {differenceInMinutes(now, new Date(table.reservation.seatedAt))} min ago
            </p>
          )}
        </div>
      )}

      {/* Actions by status */}
      <div className="flex flex-col gap-2">
        {table.status === "AVAILABLE" && !showWalkInForm && (
          <>
            <Button
              className="w-full h-11 text-sm font-semibold"
              onClick={() => setShowWalkInForm(true)}
            >
              Seat Walk-in
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 text-sm"
              onClick={() => {
                onBlockTable(table.tableId);
                onClose();
              }}
            >
              Block Table
            </Button>
          </>
        )}

        {table.status === "AVAILABLE" && showWalkInForm && (
          <>
            <input
              type="text"
              placeholder="Guest name"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="w-full h-11 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Party size:
              </label>
              <div className="flex items-center gap-1">
                <button
                  className="h-9 w-9 rounded-md border flex items-center justify-center text-lg font-bold hover:bg-accent"
                  onClick={() => setWalkInSize(Math.max(1, walkInSize - 1))}
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold">{walkInSize}</span>
                <button
                  className="h-9 w-9 rounded-md border flex items-center justify-center text-lg font-bold hover:bg-accent"
                  onClick={() => setWalkInSize(Math.min(20, walkInSize + 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 h-11 text-sm font-semibold"
                onClick={handleSeatWalkIn}
                disabled={!walkInName.trim()}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 text-sm"
                onClick={() => setShowWalkInForm(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {(table.status === "RESERVED" || table.status === "LATE") && table.reservation && (
          <>
            <Button
              className="w-full h-11 text-sm font-semibold"
              onClick={() => {
                onSeatReservation(table.reservation!.id);
                onClose();
              }}
            >
              Seat Party
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 text-sm"
              onClick={() => {
                onMarkNoShow(table.reservation!.id);
                onClose();
              }}
            >
              Mark No-Show
            </Button>
          </>
        )}

        {table.status === "SEATED" && table.reservation && (
          <>
            <Button
              className="w-full h-11 text-sm font-semibold"
              onClick={() => {
                onCompleteReservation(table.reservation!.id);
                onClose();
              }}
            >
              Complete &amp; Free Table
            </Button>
          </>
        )}

        {table.status === "BLOCKED" && (
          <Button
            className="w-full h-11 text-sm font-semibold"
            onClick={() => {
              onUnblockTable(table.tableId);
              onClose();
            }}
          >
            Unblock Table
          </Button>
        )}
      </div>
    </div>
  );
}
