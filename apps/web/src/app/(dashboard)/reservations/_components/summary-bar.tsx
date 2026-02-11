"use client";

import { CalendarDays, Users, CheckCircle2, Armchair, AlertTriangle, Grid3x3 } from "lucide-react";

interface SummaryBarProps {
  totalBookings: number;
  totalCovers: number;
  confirmed: number;
  seated: number;
  noShows: number;
  pending: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={`rounded-md p-2 ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function SummaryBar({
  totalBookings,
  totalCovers,
  confirmed,
  seated,
  noShows,
  pending,
}: SummaryBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Bookings" value={totalBookings} icon={CalendarDays} color="bg-slate-600" />
      <StatCard label="Covers" value={totalCovers} icon={Users} color="bg-indigo-600" />
      <StatCard label="Confirmed" value={confirmed} icon={CheckCircle2} color="bg-emerald-600" />
      <StatCard label="Seated" value={seated} icon={Armchair} color="bg-blue-600" />
      <StatCard label="No-shows" value={noShows} icon={AlertTriangle} color="bg-red-600" />
      <StatCard label="Pending" value={pending} icon={Grid3x3} color="bg-amber-600" />
    </div>
  );
}
