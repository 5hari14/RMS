"use client";

import { format } from "date-fns";
import { trpc } from "@/trpc/client";

const ACTION_LABELS: Record<string, string> = {
  "reservation.create": "Created",
  "reservation.update": "Updated",
  "reservation.updateStatus": "Status changed",
  "reservation.cancel": "Cancelled",
  "reservation.assignTable": "Table assigned",
};

interface AuditTimelineProps {
  reservationId: string;
}

export function AuditTimeline({ reservationId }: AuditTimelineProps) {
  const { data: logs = [] } = trpc.reservation.getAuditLog.useQuery(
    { reservationId },
  );

  if (logs.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">Timeline</h4>
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

        {logs.map((log, i) => {
          const details = log.details as Record<string, unknown> | null;
          let description = "";

          if (log.action === "reservation.updateStatus" && details) {
            description = `${details.from} \u2192 ${details.to}`;
          } else if (log.action === "reservation.cancel" && details?.reason) {
            description = `Reason: ${details.reason}`;
          } else if (log.action === "reservation.assignTable" && details) {
            description = details.previousTableId
              ? "Table reassigned"
              : "Table assigned";
          } else if (log.action === "reservation.update" && details?.changes) {
            const changes = details.changes as Record<string, unknown>;
            const keys = Object.keys(changes).filter(
              (k) => changes[k] !== undefined,
            );
            description = keys.length > 0 ? `Changed: ${keys.join(", ")}` : "";
          }

          return (
            <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
              <div
                className={`relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full border-2 ${
                  i === logs.length - 1
                    ? "border-primary bg-primary"
                    : "border-border bg-background"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {ACTION_LABELS[log.action] ?? log.action}
                </p>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  {log.user?.name && ` \u00B7 ${log.user.name}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
