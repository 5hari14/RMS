"use client";

import * as React from "react";
import type { LiveTableData } from "@bites-rms/types";
import { LiveTableShape } from "./live-table-shape";
import { TableActionPopup } from "./table-action-popup";

const CANVAS_W = 2000;
const CANVAS_H = 1400;

interface Props {
  tables: LiveTableData[];
  zoom: number;
  now: Date;
  onSeatWalkIn: (tableId: string, guestName: string, partySize: number) => void;
  onBlockTable: (tableId: string) => void;
  onUnblockTable: (tableId: string) => void;
  onSeatReservation: (reservationId: string) => void;
  onCompleteReservation: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
}

export function LiveCanvas({
  tables,
  zoom,
  now,
  onSeatWalkIn,
  onBlockTable,
  onUnblockTable,
  onSeatReservation,
  onCompleteReservation,
  onMarkNoShow,
}: Props) {
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const selectedTable = tables.find((t) => t.tableId === selectedTableId);

  // Compute popup position near the selected table
  const popupPosition = React.useMemo(() => {
    if (!selectedTable) return { left: 0, top: 0 };
    const centerX = (selectedTable.x + selectedTable.width / 2) * zoom;
    const centerY = (selectedTable.y + selectedTable.height) * zoom + 8;
    return { left: centerX - 144, top: centerY };
  }, [selectedTable, zoom]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
      setSelectedTableId(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-auto bg-muted/30 relative"
      onClick={handleCanvasClick}
    >
      <div
        data-canvas="true"
        style={{
          width: CANVAS_W * zoom,
          height: CANVAS_H * zoom,
          position: "relative",
        }}
      >
        {/* Tables */}
        {tables.map((table) => (
          <LiveTableShape
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
          <div
            style={{
              position: "absolute",
              left: popupPosition.left,
              top: popupPosition.top,
              zIndex: 50,
            }}
          >
            <TableActionPopup
              table={selectedTable}
              now={now}
              onClose={() => setSelectedTableId(null)}
              onSeatWalkIn={onSeatWalkIn}
              onBlockTable={onBlockTable}
              onUnblockTable={onUnblockTable}
              onSeatReservation={onSeatReservation}
              onCompleteReservation={onCompleteReservation}
              onMarkNoShow={onMarkNoShow}
            />
          </div>
        )}
      </div>
    </div>
  );
}
