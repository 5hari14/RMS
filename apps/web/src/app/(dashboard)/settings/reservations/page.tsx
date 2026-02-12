"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bites-rms/ui";

const DURATION_OPTIONS = [
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "120 minutes" },
  { value: "150", label: "150 minutes" },
];

const INTERVAL_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
];

export default function ReservationSettingsPage() {
  const utils = trpc.useUtils();
  const { data: restaurant, isLoading } = trpc.settings.getRestaurant.useQuery();

  const updateMutation = trpc.settings.updateReservationSettings.useMutation({
    onSuccess: () => {
      utils.settings.getRestaurant.invalidate();
      toast.success("Reservation settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = React.useState({
    defaultDurationMinutes: 90,
    slotIntervalMinutes: 15,
    maxAdvanceDays: 30,
    minPartySize: 1,
    maxPartySize: 10,
    onlineBookingCapacity: 100,
    autoConfirmOnlineBookings: true,
    noShowGracePeriodMinutes: 15,
  });

  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (restaurant) {
      setForm({
        defaultDurationMinutes: restaurant.defaultDurationMinutes,
        slotIntervalMinutes: restaurant.slotIntervalMinutes,
        maxAdvanceDays: restaurant.maxAdvanceDays,
        minPartySize: restaurant.minPartySize,
        maxPartySize: restaurant.maxPartySize,
        onlineBookingCapacity: restaurant.onlineBookingCapacity,
        autoConfirmOnlineBookings: restaurant.autoConfirmOnlineBookings,
        noShowGracePeriodMinutes: restaurant.noShowGracePeriodMinutes,
      });
      setDirty(false);
    }
  }, [restaurant]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    updateMutation.mutate(form);
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reservation Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure how reservations are handled.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Time Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Time Settings</CardTitle>
          <CardDescription>Duration, intervals, and advance booking window.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Default Duration</Label>
              <Select
                value={String(form.defaultDurationMinutes)}
                onValueChange={(v) => updateField("defaultDurationMinutes", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Time Slot Interval</Label>
              <Select
                value={String(form.slotIntervalMinutes)}
                onValueChange={(v) => updateField("slotIntervalMinutes", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="advanceDays">Advance Booking Window (days)</Label>
            <Input
              id="advanceDays"
              type="number"
              min={1}
              max={90}
              value={form.maxAdvanceDays}
              onChange={(e) => updateField("maxAdvanceDays", Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              How far in advance customers can book (1–90 days).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Party Size */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Party Size</CardTitle>
          <CardDescription>
            Minimum and maximum party sizes for online bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="minParty">Minimum Party Size</Label>
            <Input
              id="minParty"
              type="number"
              min={1}
              max={50}
              value={form.minPartySize}
              onChange={(e) => updateField("minPartySize", Number(e.target.value))}
              className="w-32"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxParty">Maximum Party Size</Label>
            <Input
              id="maxParty"
              type="number"
              min={1}
              max={50}
              value={form.maxPartySize}
              onChange={(e) => updateField("maxPartySize", Number(e.target.value))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Online Booking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Booking</CardTitle>
          <CardDescription>
            Capacity, auto-confirmation, and no-show grace period.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="capacity">Online Booking Capacity (%)</Label>
            <Input
              id="capacity"
              type="number"
              min={0}
              max={100}
              value={form.onlineBookingCapacity}
              onChange={(e) => updateField("onlineBookingCapacity", Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Percentage of tables available for online reservations (0 = disabled, 100 = all).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={form.autoConfirmOnlineBookings}
              onCheckedChange={(v) => updateField("autoConfirmOnlineBookings", !!v)}
            />
            <div>
              <Label className="font-normal">Auto-confirm online bookings</Label>
              <p className="text-xs text-muted-foreground">
                If off, online bookings start as PENDING for manual review.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="graceMinutes">No-Show Grace Period (minutes)</Label>
            <Input
              id="graceMinutes"
              type="number"
              min={0}
              max={60}
              value={form.noShowGracePeriodMinutes}
              onChange={(e) => updateField("noShowGracePeriodMinutes", Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Minutes to wait past reservation time before allowing no-show marking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
