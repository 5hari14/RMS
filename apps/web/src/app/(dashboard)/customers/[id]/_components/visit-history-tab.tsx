"use client";

import { format } from "date-fns";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@bites-rms/ui";

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  SEATED: { label: "Seated", className: "bg-blue-100 text-blue-800 border-blue-200" },
  COMPLETED: { label: "Completed", className: "bg-slate-100 text-slate-800 border-slate-200" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200" },
  NO_SHOW: { label: "No-show", className: "bg-red-100 text-red-800 border-red-200" },
};

interface Reservation {
  id: string;
  date: Date | string;
  time: Date | string;
  partySize: number;
  duration: number;
  status: string;
  source: string;
  table: {
    id: string;
    number: number;
    name: string | null;
    section: string | null;
  } | null;
}

interface Props {
  reservations: Reservation[];
}

export function VisitHistoryTab({ reservations }: Props) {
  if (reservations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No visit history yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-center">Party Size</TableHead>
            <TableHead>Table</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => {
            const statusInfo = STATUS_DISPLAY[r.status];
            return (
              <TableRow key={r.id}>
                <TableCell>{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                <TableCell>{format(new Date(r.time), "HH:mm")}</TableCell>
                <TableCell className="text-center">{r.partySize}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.table
                    ? r.table.name ?? `Table #${r.table.number}`
                    : "\u2014"}
                </TableCell>
                <TableCell>
                  {statusInfo ? (
                    <Badge variant="outline" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  ) : (
                    r.status
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground capitalize">
                  {r.source.toLowerCase().replace("_", " ")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
