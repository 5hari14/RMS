"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  cn,
} from "@bites-rms/ui";

interface TableData {
  tableNumber: number;
  tableName: string | null;
  section: string;
  maxCovers: number;
  bookings: number;
  occupancyRate: number;
}

interface Props {
  data: TableData[];
  overallOccupancy: number;
  loading?: boolean;
}

export function TableUtilisationTable({ data, overallOccupancy, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No table data for this period
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Overall occupancy:</span>
        <Badge
          variant={overallOccupancy >= 60 ? "default" : "secondary"}
          className="text-xs"
        >
          {overallOccupancy}%
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Table</TableHead>
            <TableHead>Section</TableHead>
            <TableHead className="text-right">Bookings</TableHead>
            <TableHead className="text-right">Occupancy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 10).map((table, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">
                #{table.tableNumber}
                {table.tableName ? ` (${table.tableName})` : ""}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {table.section}
              </TableCell>
              <TableCell className="text-right text-sm">
                {table.bookings}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        table.occupancyRate >= 75
                          ? "bg-green-500"
                          : table.occupancyRate >= 40
                            ? "bg-amber-500"
                            : "bg-red-400",
                      )}
                      style={{ width: `${table.occupancyRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">
                    {table.occupancyRate}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
