"use client";

import * as React from "react";
import { format } from "date-fns";
import { Moon, Sun } from "lucide-react";
import { Button } from "@bites-rms/ui";
import type { LiveSummary } from "@bites-rms/types";

interface Props {
  restaurantName: string;
  summary: LiveSummary | undefined;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function BottomBar({ restaurantName, summary, darkMode, onToggleDarkMode }: Props) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between border-t bg-card px-6 py-3 shrink-0">
      {/* Left: restaurant name + clock */}
      <div className="flex items-center gap-4">
        <span className="font-semibold text-sm">{restaurantName}</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {format(now, "HH:mm")}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(now, "EEEE, d MMM yyyy")}
        </span>
      </div>

      {/* Centre: stats */}
      <div className="flex items-center gap-6">
        <StatChip
          color="bg-orange-500"
          label="Seated"
          value={summary ? `${summary.seated}` : "—"}
        />
        <StatChip
          color="bg-emerald-500"
          label="Available"
          value={summary ? `${summary.available}` : "—"}
        />
        <StatChip
          color="bg-blue-500"
          label="Upcoming"
          value={summary ? `${summary.reservedNextHour}` : "—"}
        />
        <StatChip
          color="bg-violet-500"
          label="Waitlist"
          value={summary ? `${summary.waitlist}` : "—"}
        />
      </div>

      {/* Right: night mode toggle */}
      <Button
        variant="outline"
        className="gap-2 h-12 px-4"
        onClick={onToggleDarkMode}
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        <span className="text-sm font-medium">{darkMode ? "Day Mode" : "Night Mode"}</span>
      </Button>
    </div>
  );
}

function StatChip({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="text-lg font-bold tabular-nums">{value}</span>
      </div>
    </div>
  );
}
