"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  ScrollArea,
} from "@bites-rms/ui";
import { trpc } from "@/trpc/client";

interface CreateReservationPanelProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultDate: Date;
}

export function CreateReservationPanel({
  open,
  onClose,
  onCreated,
  defaultDate,
}: CreateReservationPanelProps) {
  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [partySize, setPartySize] = React.useState("2");
  const [time, setTime] = React.useState("19:00");
  const [duration, setDuration] = React.useState("120");
  const [source, setSource] = React.useState("PHONE");
  const [specialRequests, setSpecialRequests] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const createMutation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      resetForm();
      onCreated();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function resetForm() {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPartySize("2");
    setTime("19:00");
    setDuration("120");
    setSource("PHONE");
    setSpecialRequests("");
    setInternalNotes("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const reservationTime = new Date(defaultDate);
    reservationTime.setHours(hours ?? 19, minutes ?? 0, 0, 0);

    createMutation.mutate({
      date: defaultDate,
      time: reservationTime,
      partySize: parseInt(partySize, 10),
      duration: parseInt(duration, 10),
      source: source as "PHONE" | "WEBSITE" | "BITES_APP" | "WALK_IN" | "GOOGLE" | "FACEBOOK" | "INSTAGRAM",
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      specialRequests: specialRequests.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>New Reservation</SheetTitle>
          <SheetDescription>
            {format(defaultDate, "EEEE, MMM d, yyyy")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <form id="create-reservation-form" onSubmit={handleSubmit} className="space-y-4 pb-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Customer info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Customer</h4>
              <div>
                <Label htmlFor="customerName">Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                  />
                </div>
              </div>
            </div>

            {/* Reservation details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Details</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="partySize">Party size *</Label>
                  <Input
                    id="partySize"
                    type="number"
                    min="1"
                    max="20"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="BITES_APP">Bites App</SelectItem>
                    <SelectItem value="WALK_IN">Walk-in</SelectItem>
                    <SelectItem value="GOOGLE">Google</SelectItem>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                    <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Notes</h4>
              <div>
                <Label htmlFor="specialRequests">Special Requests</Label>
                <textarea
                  id="specialRequests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Allergies, accessibility, celebrations..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Staff-only notes..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="submit"
            form="create-reservation-form"
            disabled={createMutation.isPending}
            className="flex-1"
          >
            {createMutation.isPending ? "Creating..." : "Create Reservation"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
