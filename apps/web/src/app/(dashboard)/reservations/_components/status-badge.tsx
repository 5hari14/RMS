"use client";

import { Badge } from "@bites-rms/ui";
import { STATUS_DISPLAY } from "./types";

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_DISPLAY[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
