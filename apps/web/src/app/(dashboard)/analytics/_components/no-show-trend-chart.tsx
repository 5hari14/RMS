"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface Props {
  data: { week: string; total: number; noShows: number; rate: number }[];
  loading?: boolean;
}

export function NoShowTrendChart({ data, loading }: Props) {
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
          dataKey="week"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          unit="%"
          domain={[0, "auto"]}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            fontSize: "12px",
          }}
          formatter={(value) => [`${value}%`, "No-Show Rate"]}
        />
        <ReferenceLine
          y={5}
          stroke="hsl(38, 92%, 50%)"
          strokeDasharray="3 3"
          label={{ value: "5%", position: "right", fontSize: 10 }}
        />
        <ReferenceLine
          y={10}
          stroke="hsl(0, 84%, 60%)"
          strokeDasharray="3 3"
          label={{ value: "10%", position: "right", fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth={2}
          dot
          name="No-Show Rate"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
