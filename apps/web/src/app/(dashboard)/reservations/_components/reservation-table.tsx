"use client";

import { format } from "date-fns";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
} from "@bites-rms/ui";
import { StatusBadge } from "./status-badge";
import { SourceIcon } from "./source-icon";
import type { Reservation } from "./types";

interface ReservationTableProps {
  reservations: Reservation[];
  onRowClick: (reservation: Reservation) => void;
}

export function ReservationTable({ reservations, onRowClick }: ReservationTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No reservations</p>
        <p className="text-sm text-muted-foreground mt-1">
          There are no reservations matching your filters.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Time</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="w-[100px]">Covers</TableHead>
          <TableHead className="w-[100px]">Table</TableHead>
          <TableHead className="w-[110px]">Status</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className="w-[60px]">Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((reservation) => {
          const customerName = reservation.customer
            ? `${reservation.customer.firstName} ${reservation.customer.lastName ?? ""}`.trim()
            : "Walk-in";

          return (
            <TableRow
              key={reservation.id}
              className="cursor-pointer"
              onClick={() => onRowClick(reservation)}
            >
              <TableCell className="font-mono font-medium">
                {format(new Date(reservation.time), "HH:mm")}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{customerName}</span>
                  {reservation.customer?.isVip && (
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-1.5 py-0"
                    >
                      VIP
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {reservation.partySize} {reservation.partySize === 1 ? "cover" : "covers"}
                </span>
              </TableCell>
              <TableCell>
                {reservation.table ? (
                  <span className="font-medium">
                    {reservation.table.name ?? `#${reservation.table.number}`}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={reservation.status} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {reservation.tags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <SourceIcon source={reservation.source} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
