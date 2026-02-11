"use client";

import * as React from "react";
import { format, differenceInMinutes } from "date-fns";
import type { LiveTableData, LiveTableStatus } from "@bites-rms/types";

interface Props {
  table: LiveTableData;
  zoom: number;
  isSelected: boolean;
  onSelect: (tableId: string) => void;
  now: Date;
}

const STATUS_COLORS: Record<LiveTableStatus, string> = {
  AVAILABLE: "hsl(145 60% 42%)",    // GREEN
  RESERVED: "hsl(215 70% 55%)",     // BLUE
  SEATED: "hsl(30 85% 52%)",        // ORANGE
  LATE: "hsl(0 72% 51%)",           // RED
  BLOCKED: "hsl(220 10% 58%)",      // GREY
};

const STATUS_LABELS: Record<LiveTableStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SEATED: "Seated",
  LATE: "Late",
  BLOCKED: "Blocked",
};

export function LiveTableShape({ table, zoom, isSelected, onSelect, now }: Props) {
  const w = table.width * zoom;
  const h = table.height * zoom;
  const x = table.x * zoom;
  const y = table.y * zoom;

  const borderRadius = (() => {
    switch (table.shape) {
      case "ROUND":
        return "50%";
      case "SQUARE":
      case "RECTANGULAR":
        return `${4 * zoom}px`;
      case "BAR":
        return `${2 * zoom}px`;
    }
  })();

  const bgColor = STATUS_COLORS[table.status];
  const label = table.name ?? `T${table.number}`;
  const baseFontSize = Math.max(9, 11 * zoom);

  // Compute info lines based on status
  const infoLines: string[] = [];

  if (table.status === "AVAILABLE") {
    infoLines.push(`${table.minCovers}-${table.maxCovers}`);
  } else if (table.status === "BLOCKED") {
    infoLines.push("Out of service");
  } else if (table.reservation) {
    const res = table.reservation;
    // Shorten guest name to fit
    const shortName = res.guestName.length > 10
      ? res.guestName.slice(0, 9) + "\u2026"
      : res.guestName;

    if (table.status === "SEATED" && res.seatedAt) {
      const mins = differenceInMinutes(now, new Date(res.seatedAt));
      infoLines.push(`${shortName}, ${res.partySize}`);
      infoLines.push(`${mins} min`);
    } else if (table.status === "RESERVED" || table.status === "LATE") {
      const timeStr = format(new Date(res.time), "HH:mm");
      infoLines.push(`${shortName}, ${res.partySize}`);
      infoLines.push(timeStr);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(table.tableId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(table.tableId);
        }
      }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius,
        background: bgColor,
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
        // Tablet touch target: ensure minimum 44px
        minWidth: 44,
        minHeight: 44,
        touchAction: "manipulation",
      }}
    >
      <span
        style={{
          fontSize: baseFontSize,
          fontWeight: 700,
          lineHeight: 1.2,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        {label}
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
      {table.isAccessible && (
        <span style={{ fontSize: baseFontSize * 0.7, marginTop: 1 }}>&#9855;</span>
      )}
    </div>
  );
}
