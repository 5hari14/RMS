"use client";

import type { LiveSummary } from "@bites-rms/types";

interface Props {
  summary: LiveSummary | undefined;
  isLoading: boolean;
}

export function LiveSummaryBar({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card p-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-40 rounded bg-muted" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Available",
      value: `${summary.available} tables`,
      color: "bg-emerald-500",
    },
    {
      label: "Seated",
      value: `${summary.seated} tables (${summary.seatedCovers} covers)`,
      color: "bg-orange-500",
    },
    {
      label: "Reserved next hour",
      value: `${summary.reservedNextHour} bookings`,
      color: "bg-blue-500",
    },
    {
      label: "Waitlist",
      value: `${summary.waitlist} parties`,
      color: "bg-violet-500",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 min-w-[140px]"
        >
          <div className={`h-3 w-3 shrink-0 rounded-full ${stat.color}`} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-sm font-semibold">{stat.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
