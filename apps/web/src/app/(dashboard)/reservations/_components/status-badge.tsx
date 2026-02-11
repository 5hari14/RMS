"use client";

import { Badge } from "@bites-rms/ui";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  },
  SEATED: {
    label: "Seated",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100",
  },
  NO_SHOW: {
    label: "No-show",
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
