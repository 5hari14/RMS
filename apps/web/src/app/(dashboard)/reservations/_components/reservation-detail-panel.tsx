"use client";

import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Separator,
  Badge,
  ScrollArea,
} from "@bites-rms/ui";
import { Clock, Users, MapPin, Phone, Mail, MessageSquare, StickyNote } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { SourceIcon } from "./source-icon";
import type { Reservation } from "./types";
import { trpc } from "@/trpc/client";

interface ReservationDetailPanelProps {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdate: () => void;
}

const STATUS_ACTIONS: Record<string, { label: string; next: string; variant: "default" | "destructive" | "outline" | "secondary" }[]> = {
  PENDING: [
    { label: "Confirm", next: "CONFIRMED", variant: "default" },
    { label: "Cancel", next: "CANCELLED", variant: "destructive" },
  ],
  CONFIRMED: [
    { label: "Seat", next: "SEATED", variant: "default" },
    { label: "No-show", next: "NO_SHOW", variant: "destructive" },
    { label: "Cancel", next: "CANCELLED", variant: "outline" },
  ],
  SEATED: [
    { label: "Complete", next: "COMPLETED", variant: "default" },
  ],
};

export function ReservationDetailPanel({
  reservation,
  open,
  onClose,
  onStatusUpdate,
}: ReservationDetailPanelProps) {
  const updateStatus = trpc.reservation.updateStatus.useMutation({
    onSuccess: () => {
      onStatusUpdate();
    },
  });

  if (!reservation) return null;

  const customerName = reservation.customer
    ? `${reservation.customer.firstName} ${reservation.customer.lastName ?? ""}`.trim()
    : "Walk-in";

  const actions = STATUS_ACTIONS[reservation.status] ?? [];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">{customerName}</SheetTitle>
            <StatusBadge status={reservation.status} />
          </div>
          <SheetDescription>
            {format(new Date(reservation.date), "EEEE, MMM d, yyyy")} at{" "}
            {format(new Date(reservation.time), "HH:mm")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Quick details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(reservation.time), "HH:mm")} ({reservation.duration} min)
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {reservation.partySize} {reservation.partySize === 1 ? "cover" : "covers"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {reservation.table
                    ? reservation.table.name ?? `Table #${reservation.table.number}`
                    : "Unassigned"}
                  {reservation.table?.section && ` (${reservation.table.section})`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <SourceIcon source={reservation.source} />
                <span className="capitalize">{reservation.source.toLowerCase().replace("_", " ")}</span>
              </div>
            </div>

            <Separator />

            {/* Customer details */}
            {reservation.customer && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Customer</h4>
                  <div className="space-y-1.5">
                    {reservation.customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{reservation.customer.email}</span>
                      </div>
                    )}
                    {reservation.customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{reservation.customer.phone}</span>
                      </div>
                    )}
                    <div className="flex gap-1 mt-1">
                      {reservation.customer.isVip && (
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800 border-purple-200 text-xs"
                        >
                          VIP
                        </Badge>
                      )}
                      {reservation.customer.isBlacklisted && (
                        <Badge variant="destructive" className="text-xs">
                          Blacklisted
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Tags */}
            {reservation.tags.length > 0 && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tags</h4>
                  <div className="flex gap-1.5 flex-wrap">
                    {reservation.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Special requests */}
            {reservation.specialRequests && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Special Requests
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {reservation.specialRequests}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Internal notes */}
            {reservation.internalNotes && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Internal Notes
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {reservation.internalNotes}
                </p>
              </div>
            )}

            {/* Created by */}
            {reservation.createdBy && (
              <p className="text-xs text-muted-foreground">
                Created by {reservation.createdBy.name ?? "Unknown"}
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2 pt-4 border-t">
            {actions.map((action) => (
              <Button
                key={action.next}
                variant={action.variant}
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    id: reservation.id,
                    status: action.next as "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW",
                  })
                }
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
