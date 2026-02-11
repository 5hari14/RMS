"use client";

import { BookingWidget, type WidgetConfig } from "@bites-rms/ui";

interface WidgetShellProps {
  restaurantId: string;
  primaryColor: string;
}

export function WidgetShell({ restaurantId, primaryColor }: WidgetShellProps) {
  const config: WidgetConfig = {
    restaurantId,
    apiBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
    primaryColor,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 16px",
        background: "#f8fafc",
      }}
    >
      <BookingWidget config={config} />
    </div>
  );
}
