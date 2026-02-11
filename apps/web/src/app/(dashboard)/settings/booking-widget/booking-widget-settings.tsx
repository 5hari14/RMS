"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Separator,
} from "@bites-rms/ui";

export function BookingWidgetSettings() {
  const utils = trpc.useUtils();

  const { data: widget, isLoading } =
    trpc.settings.getBookingWidget.useQuery();
  const { data: restaurant } = trpc.settings.getRestaurant.useQuery();

  const upsertMutation = trpc.settings.upsertBookingWidget.useMutation({
    onSuccess: () => {
      utils.settings.getBookingWidget.invalidate();
    },
  });

  const [isEnabled, setIsEnabled] = React.useState(true);
  const [maxPartySize, setMaxPartySize] = React.useState(10);
  const [minAdvanceMinutes, setMinAdvanceMinutes] = React.useState(60);
  const [maxAdvanceDays, setMaxAdvanceDays] = React.useState(30);
  const [slotIntervalMinutes, setSlotIntervalMinutes] = React.useState(15);
  const [defaultDurationMinutes, setDefaultDurationMinutes] =
    React.useState(90);
  const [confirmationMessage, setConfirmationMessage] = React.useState("");
  const [primaryColor, setPrimaryColor] = React.useState("#1e293b");

  // Sync form state when data loads
  React.useEffect(() => {
    if (widget) {
      setIsEnabled(widget.isEnabled);
      setMaxPartySize(widget.maxPartySize);
      setMinAdvanceMinutes(widget.minAdvanceMinutes);
      setMaxAdvanceDays(widget.maxAdvanceDays);
      setSlotIntervalMinutes(widget.slotIntervalMinutes);
      setDefaultDurationMinutes(widget.defaultDurationMinutes);
      setConfirmationMessage(widget.confirmationMessage ?? "");
      setPrimaryColor(widget.primaryColor);
    }
  }, [widget]);

  const handleSave = () => {
    upsertMutation.mutate({
      isEnabled,
      maxPartySize,
      minAdvanceMinutes,
      maxAdvanceDays,
      slotIntervalMinutes,
      defaultDurationMinutes,
      confirmationMessage: confirmationMessage || null,
      primaryColor,
    });
  };

  const restaurantId = restaurant?.id;
  const widgetUrl =
    typeof window !== "undefined" && restaurantId
      ? `${window.location.origin}/widget/${restaurantId}`
      : "";

  const embedCode = restaurantId
    ? `<iframe src="${widgetUrl}" style="width:100%;max-width:420px;height:600px;border:none;border-radius:12px;" title="Book a table"></iframe>`
    : "";

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable / Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Booking</CardTitle>
          <CardDescription>
            Enable or disable the online booking widget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">
              {isEnabled
                ? "Widget is active — customers can book online"
                : "Widget is disabled — online bookings are paused"}
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            Control how the booking widget works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max party size</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxPartySize}
                onChange={(e) => setMaxPartySize(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Advance booking (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={maxAdvanceDays}
                onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Min notice (minutes)</Label>
              <Input
                type="number"
                min={0}
                max={10080}
                value={minAdvanceMinutes}
                onChange={(e) => setMinAdvanceMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Slot interval (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={slotIntervalMinutes}
                onChange={(e) => setSlotIntervalMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Default duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                max={480}
                value={defaultDurationMinutes}
                onChange={(e) =>
                  setDefaultDurationMinutes(Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label>Brand colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  maxLength={7}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Confirmation message</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              placeholder="Optional message shown after booking (e.g. 'See you soon! Free parking available.')"
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={upsertMutation.isPending}>
        {upsertMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>

      {upsertMutation.isSuccess && (
        <span className="text-sm text-green-600 ml-3">Saved!</span>
      )}

      <Separator className="my-6" />

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed Code</CardTitle>
          <CardDescription>
            Copy this snippet and paste it into your website&apos;s HTML
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {widgetUrl && (
            <div>
              <Label>Widget URL</Label>
              <div className="flex items-center gap-2">
                <Input value={widgetUrl} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(widgetUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>Iframe embed</Label>
            <div className="relative">
              <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {embedCode || "Save settings first to generate embed code"}
              </pre>
              {embedCode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => navigator.clipboard.writeText(embedCode)}
                >
                  Copy
                </Button>
              )}
            </div>
          </div>

          {widgetUrl && (
            <div>
              <Label>Preview</Label>
              <a
                href={widgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Open widget in new tab &rarr;
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
