"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  format,
} from "date-fns";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@bites-rms/ui";
import {
  CalendarDays,
  Download,
  TrendingDown,
  TrendingUp,
  Users,
  CalendarCheck,
  UserX,
  BarChart3,
} from "lucide-react";
import { CoversLineChart } from "./covers-line-chart";
import { SourceDoughnutChart } from "./source-doughnut-chart";
import { PeakHoursBarChart } from "./peak-hours-bar-chart";
import { NoShowTrendChart } from "./no-show-trend-chart";
import { TopCustomersTable } from "./top-customers-table";
import { TableUtilisationTable } from "./table-utilisation-table";
import { exportAnalyticsCsv } from "./export-csv";

type Preset = "today" | "this_week" | "this_month" | "last_30" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_30: "Last 30 Days",
  custom: "Custom Range",
};

function getPresetRange(preset: Preset): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case "this_month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "last_30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "custom":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }
}

export function AnalyticsDashboard() {
  const [preset, setPreset] = React.useState<Preset>("last_30");
  const [dateRange, setDateRange] = React.useState(getPresetRange("last_30"));
  const [customStart, setCustomStart] = React.useState<Date | undefined>();
  const [customEnd, setCustomEnd] = React.useState<Date | undefined>();

  const handlePresetChange = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      setDateRange(getPresetRange(p));
    }
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      setDateRange({ start: startOfDay(customStart), end: endOfDay(customEnd) });
    }
  };

  const rangeInput = {
    startDate: dateRange.start,
    endDate: dateRange.end,
  };

  // Queries
  const summary = trpc.analytics.getDateRangeSummary.useQuery(rangeInput);
  const prevSummary = trpc.analytics.getPreviousPeriodSummary.useQuery(rangeInput);
  const dailyCovers = trpc.analytics.getDailyCovers.useQuery(rangeInput);
  const sourceBreakdown = trpc.analytics.getBookingSourceBreakdown.useQuery(rangeInput);
  const peakTimes = trpc.analytics.getPeakTimeAnalysis.useQuery(rangeInput);
  const noShowTrend = trpc.analytics.getNoShowRate.useQuery(rangeInput);
  const topCustomers = trpc.analytics.getTopCustomers.useQuery({
    ...rangeInput,
    limit: 10,
  });
  const tableUtil = trpc.analytics.getTableUtilisation.useQuery(rangeInput);

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const coversChange = prevSummary.data
    ? pctChange(summary.data?.totalCovers ?? 0, prevSummary.data.totalCovers)
    : null;
  const bookingsChange = prevSummary.data
    ? pctChange(summary.data?.totalBookings ?? 0, prevSummary.data.totalBookings)
    : null;

  const handleExport = () => {
    exportAnalyticsCsv({
      dateRange: `${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}`,
      summary: summary.data ?? null,
      dailyCovers: dailyCovers.data ?? [],
      sourceBreakdown: sourceBreakdown.data ?? [],
      topCustomers: topCustomers.data ?? [],
      tableUtilisation: tableUtil.data?.tables ?? [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {format(dateRange.start, "MMM d, yyyy")} –{" "}
            {format(dateRange.end, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) =>
            p === "custom" ? (
              <Popover key={p}>
                <PopoverTrigger asChild>
                  <Button
                    variant={preset === "custom" ? "default" : "outline"}
                    size="sm"
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 space-y-3" align="end">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium mb-1">Start</p>
                      <Calendar
                        selected={customStart}
                        onSelect={setCustomStart}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">End</p>
                      <Calendar
                        selected={customEnd}
                        onSelect={setCustomEnd}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!customStart || !customEnd}
                    onClick={() => {
                      handlePresetChange("custom");
                      applyCustomRange();
                    }}
                  >
                    Apply Range
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                key={p}
                variant={preset === p ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange(p)}
              >
                {PRESET_LABELS[p]}
              </Button>
            ),
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ROW 1 — Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Covers"
          value={summary.data?.totalCovers ?? 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          change={coversChange}
          loading={summary.isLoading}
        />
        <StatCard
          title="Total Bookings"
          value={summary.data?.totalBookings ?? 0}
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          change={bookingsChange}
          loading={summary.isLoading}
        />
        <StatCard
          title="No-Show Rate"
          value={`${summary.data?.noShowRate ?? 0}%`}
          icon={<UserX className="h-4 w-4 text-muted-foreground" />}
          loading={summary.isLoading}
          valueClassName={cn(
            (summary.data?.noShowRate ?? 0) > 10
              ? "text-red-600"
              : (summary.data?.noShowRate ?? 0) > 5
                ? "text-amber-600"
                : "text-green-600",
          )}
        />
        <StatCard
          title="Avg Covers / Day"
          value={summary.data?.avgCoversPerDay ?? 0}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          loading={summary.isLoading}
        />
      </div>

      {/* ROW 2 — Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Covers</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <CoversLineChart
              data={dailyCovers.data ?? []}
              loading={dailyCovers.isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Sources</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <SourceDoughnutChart
              data={sourceBreakdown.data ?? []}
              loading={sourceBreakdown.isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* ROW 3 — Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Covers by Hour</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <PeakHoursBarChart
              data={peakTimes.data ?? []}
              loading={peakTimes.isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No-Show Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <NoShowTrendChart
              data={noShowTrend.data ?? []}
              loading={noShowTrend.isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* ROW 4 — Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <TopCustomersTable
              data={topCustomers.data ?? []}
              loading={topCustomers.isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Table Utilisation</CardTitle>
          </CardHeader>
          <CardContent>
            <TableUtilisationTable
              data={tableUtil.data?.tables ?? []}
              overallOccupancy={tableUtil.data?.overallOccupancy ?? 0}
              loading={tableUtil.isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  change,
  loading,
  valueClassName,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: number | null;
  loading?: boolean;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon}
        </div>
        {loading ? (
          <div className="h-8 w-20 rounded bg-muted animate-pulse mt-1" />
        ) : (
          <div className="flex items-end gap-2 mt-1">
            <span className={cn("text-2xl font-bold", valueClassName)}>
              {value}
            </span>
            {change !== null && change !== undefined && (
              <span
                className={cn(
                  "text-xs font-medium flex items-center gap-0.5 mb-1",
                  change >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
