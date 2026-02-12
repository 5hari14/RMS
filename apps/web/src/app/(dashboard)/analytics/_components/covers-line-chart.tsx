"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Props {
  data: { date: string; covers: number; bookings: number }[];
  loading?: boolean;
}

export function CoversLineChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            fontSize: "12px",
          }}
        />
        <Line
          type="monotone"
          dataKey="covers"
          stroke="hsl(221, 83%, 53%)"
          strokeWidth={2}
          dot={data.length <= 31}
          name="Covers"
        />
        <Line
          type="monotone"
          dataKey="bookings"
          stroke="hsl(262, 83%, 58%)"
          strokeWidth={2}
          dot={data.length <= 31}
          strokeDasharray="5 5"
          name="Bookings"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
