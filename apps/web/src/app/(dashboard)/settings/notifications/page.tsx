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
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@bites-rms/ui";

export default function NotificationSettingsPage() {
  const utils = trpc.useUtils();
  const { data: restaurant, isLoading } = trpc.settings.getRestaurant.useQuery();

  const updateMutation = trpc.settings.updateNotificationSettings.useMutation({
    onSuccess: () => {
      utils.settings.getRestaurant.invalidate();
      toast.success("Notification settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = React.useState({
    enableEmailConfirmations: true,
    enableSmsConfirmations: true,
    enableReminders: true,
    reminderTiming: "24h",
    customConfirmationMsg: "",
  });

  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (restaurant) {
      setForm({
        enableEmailConfirmations: restaurant.enableEmailConfirmations,
        enableSmsConfirmations: restaurant.enableSmsConfirmations,
        enableReminders: restaurant.enableReminders,
        reminderTiming: restaurant.reminderTiming,
        customConfirmationMsg: restaurant.customConfirmationMsg ?? "",
      });
      setDirty(false);
    }
  }, [restaurant]);

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    updateMutation.mutate({
      enableEmailConfirmations: form.enableEmailConfirmations,
      enableSmsConfirmations: form.enableSmsConfirmations,
      enableReminders: form.enableReminders,
      reminderTiming: form.reminderTiming as "24h" | "2h" | "both",
      customConfirmationMsg: form.customConfirmationMsg || null,
    });
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control how and when your customers are notified.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Channels */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
          <CardDescription>
            Enable or disable different notification methods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={form.enableEmailConfirmations}
              onCheckedChange={(v) => updateField("enableEmailConfirmations", !!v)}
            />
            <div>
              <Label className="font-normal">Email Confirmations</Label>
              <p className="text-xs text-muted-foreground">
                Send booking confirmations via email.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Checkbox
              checked={form.enableSmsConfirmations}
              onCheckedChange={(v) => updateField("enableSmsConfirmations", !!v)}
            />
            <div>
              <Label className="font-normal">SMS Confirmations</Label>
              <p className="text-xs text-muted-foreground">
                Send booking confirmations via SMS.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Checkbox
              checked={form.enableReminders}
              onCheckedChange={(v) => updateField("enableReminders", !!v)}
            />
            <div>
              <Label className="font-normal">Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Send reminder notifications before reservations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Timing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Reminder Timing</CardTitle>
          <CardDescription>When should reminders be sent?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-w-xs">
            <Label>Send Reminders</Label>
            <Select
              value={form.reminderTiming}
              onValueChange={(v) => updateField("reminderTiming", v)}
              disabled={!form.enableReminders}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 hours before</SelectItem>
                <SelectItem value="2h">2 hours before</SelectItem>
                <SelectItem value="both">Both (24h and 2h)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Custom Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Confirmation Message</CardTitle>
          <CardDescription>
            Additional text appended to the standard confirmation template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="e.g., Please arrive 10 minutes early. Smart casual dress code."
            value={form.customConfirmationMsg}
            onChange={(e) => updateField("customConfirmationMsg", e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {form.customConfirmationMsg.length}/500 characters
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
