"use client";

import * as React from "react";
import type { FloorTable } from "./types";
import { GRID_SIZE } from "./types";

interface Props {
  tables: FloorTable[];
  selectedIds: Set<string>;
  zoom: number;
  snapEnabled: boolean;
  onSelectTable: (id: string, additive: boolean) => void;
  onMoveTable: (id: string, x: number, y: number) => void;
  onDeselectAll: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const CANVAS_W = 2000;
const CANVAS_H = 1400;

export function FloorCanvas({
  tables,
  selectedIds,
  zoom,
  snapEnabled,
  onSelectTable,
  onMoveTable,
  onDeselectAll,
  canvasRef,
}: Props) {
  const [dragging, setDragging] = React.useState<{
    id: string;
    startX: number;
    startY: number;
    tableStartX: number;
    tableStartY: number;
  } | null>(null);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent, table: FloorTable) => {
      e.stopPropagation();
      const additive = e.shiftKey;
      onSelectTable(table.clientId, additive);
      setDragging({
        id: table.clientId,
        startX: e.clientX,
        startY: e.clientY,
        tableStartX: table.x,
        tableStartY: table.y,
      });
    },
    [onSelectTable],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      let newX = dragging.tableStartX + dx;
      let newY = dragging.tableStartY + dy;
      if (snapEnabled) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }
      onMoveTable(dragging.id, Math.max(0, newX), Math.max(0, newY));
    },
    [dragging, zoom, snapEnabled, onMoveTable],
  );

  const handleMouseUp = React.useCallback(() => {
    setDragging(null);
  }, []);

  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
        onDeselectAll();
      }
    },
    [onDeselectAll],
  );

  // Find combination groups for drawing lines
  const combinedGroups = React.useMemo(() => {
    const groups: FloorTable[][] = [];
    const visited = new Set<string>();
    for (const t of tables) {
      if (visited.has(t.clientId) || t.combinedWith.length === 0) continue;
      const group = [t];
      visited.add(t.clientId);
      for (const cid of t.combinedWith) {
        const other = tables.find((tt) => tt.clientId === cid);
        if (other && !visited.has(other.clientId)) {
          group.push(other);
          visited.add(other.clientId);
        }
      }
      if (group.length > 1) groups.push(group);
    }
    return groups;
  }, [tables]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-auto bg-muted/30 relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <div
        data-canvas="true"
        style={{
          width: CANVAS_W * zoom,
          height: CANVAS_H * zoom,
          position: "relative",
          backgroundImage: snapEnabled
            ? `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`
            : undefined,
          backgroundSize: snapEnabled
            ? `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`
            : undefined,
        }}
      >
        {/* Combination lines */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {combinedGroups.map((group, gi) =>
            group.slice(1).map((t, i) => {
              const a = group[i]!;
              const b = t;
              return (
                <line
                  key={`${gi}-${i}`}
                  x1={(a.x + a.width / 2) * zoom}
                  y1={(a.y + a.height / 2) * zoom}
                  x2={(b.x + b.width / 2) * zoom}
                  y2={(b.y + b.height / 2) * zoom}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2 * zoom}
                  strokeDasharray={`${6 * zoom} ${4 * zoom}`}
                  opacity={0.5}
                />
              );
            }),
          )}
        </svg>

        {/* Tables */}
        {tables.map((table) => {
          const isSelected = selectedIds.has(table.clientId);
          return (
            <TableShape
              key={table.clientId}
              table={table}
              zoom={zoom}
              isSelected={isSelected}
              onMouseDown={(e) => handleMouseDown(e, table)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table shape rendering
// ─────────────────────────────────────────────────────────────────────────────

function TableShape({
  table,
  zoom,
  isSelected,
  onMouseDown,
}: {
  table: FloorTable;
  zoom: number;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const w = table.width * zoom;
  const h = table.height * zoom;
  const x = table.x * zoom;
  const y = table.y * zoom;

  const borderRadius = (() => {
    switch (table.shape) {
      case "ROUND":
        return "50%";
      case "SQUARE":
        return `${4 * zoom}px`;
      case "RECTANGULAR":
        return `${4 * zoom}px`;
      case "BAR":
        return `${2 * zoom}px`;
    }
  })();

  const sectionColors: Record<string, string> = {
    INDOOR: "hsl(215 60% 55%)",
    OUTDOOR: "hsl(145 55% 45%)",
    TERRACE: "hsl(35 80% 50%)",
    PRIVATE: "hsl(275 50% 50%)",
    BAR: "hsl(350 60% 50%)",
  };

  const bgColor = sectionColors[table.section] ?? "hsl(215 60% 55%)";
  const label = table.name ?? `T${table.number}`;
  const capacity = `${table.minCovers}-${table.maxCovers}`;
  const fontSize = Math.max(9, 11 * zoom);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius,
        background: bgColor,
        border: isSelected
          ? `${2 * zoom}px solid hsl(var(--ring))`
          : `${1 * zoom}px solid rgba(255,255,255,0.3)`,
        boxShadow: isSelected
          ? `0 0 0 ${3 * zoom}px hsl(var(--ring) / 0.25)`
          : `0 ${1 * zoom}px ${3 * zoom}px rgba(0,0,0,0.15)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "move",
        userSelect: "none",
        color: "#fff",
        transition: "box-shadow 0.1s",
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <span style={{ fontSize, fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
      <span style={{ fontSize: fontSize * 0.8, opacity: 0.85, lineHeight: 1 }}>
        ({capacity})
      </span>
      {table.isAccessible && (
        <span style={{ fontSize: fontSize * 0.75, marginTop: 1 }}>♿</span>
      )}
    </div>
  );
}
