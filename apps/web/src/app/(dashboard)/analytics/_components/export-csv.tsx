interface ExportData {
  dateRange: string;
  summary: {
    totalBookings: number;
    totalCovers: number;
    noShows: number;
    noShowRate: number;
    cancellations: number;
    walkIns: number;
    avgCoversPerDay: number;
  } | null;
  dailyCovers: { date: string; covers: number; bookings: number }[];
  sourceBreakdown: { source: string; count: number }[];
  topCustomers: {
    name: string;
    visits: number;
    covers: number;
    totalSpend: number;
  }[];
  tableUtilisation: {
    tableNumber: number;
    tableName: string | null;
    section: string;
    bookings: number;
    occupancyRate: number;
  }[];
}

export function exportAnalyticsCsv(data: ExportData) {
  const lines: string[] = [];

  // Summary section
  lines.push("Analytics Report");
  lines.push(`Period,${data.dateRange}`);
  lines.push("");

  if (data.summary) {
    lines.push("Summary");
    lines.push("Metric,Value");
    lines.push(`Total Bookings,${data.summary.totalBookings}`);
    lines.push(`Total Covers,${data.summary.totalCovers}`);
    lines.push(`No-Shows,${data.summary.noShows}`);
    lines.push(`No-Show Rate,${data.summary.noShowRate}%`);
    lines.push(`Cancellations,${data.summary.cancellations}`);
    lines.push(`Walk-ins,${data.summary.walkIns}`);
    lines.push(`Avg Covers/Day,${data.summary.avgCoversPerDay}`);
    lines.push("");
  }

  // Daily covers
  if (data.dailyCovers.length > 0) {
    lines.push("Daily Covers");
    lines.push("Date,Covers,Bookings");
    for (const d of data.dailyCovers) {
      lines.push(`${d.date},${d.covers},${d.bookings}`);
    }
    lines.push("");
  }

  // Source breakdown
  if (data.sourceBreakdown.length > 0) {
    lines.push("Booking Sources");
    lines.push("Source,Count");
    for (const s of data.sourceBreakdown) {
      lines.push(`${s.source},${s.count}`);
    }
    lines.push("");
  }

  // Top customers
  if (data.topCustomers.length > 0) {
    lines.push("Top Customers");
    lines.push("Name,Visits,Covers,Spend");
    for (const c of data.topCustomers) {
      lines.push(
        `"${c.name}",${c.visits},${c.covers},${c.totalSpend > 0 ? (c.totalSpend / 100).toFixed(2) : 0}`,
      );
    }
    lines.push("");
  }

  // Table utilisation
  if (data.tableUtilisation.length > 0) {
    lines.push("Table Utilisation");
    lines.push("Table,Section,Bookings,Occupancy %");
    for (const t of data.tableUtilisation) {
      const name = t.tableName
        ? `#${t.tableNumber} (${t.tableName})`
        : `#${t.tableNumber}`;
      lines.push(`"${name}",${t.section},${t.bookings},${t.occupancyRate}`);
    }
  }

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics-${data.dateRange.replace(/\s/g, "_")}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
