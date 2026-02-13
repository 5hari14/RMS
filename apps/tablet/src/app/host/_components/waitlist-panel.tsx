"use client";

import * as React from "react";
import { differenceInMinutes } from "date-fns";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { Plus, Bell, Armchair, X } from "lucide-react";
import { Button, Input, Label, Badge } from "@bites-rms/ui";

export function WaitlistPanel() {
  const utils = trpc.useUtils();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const { data: entries = [], refetch } = trpc.waitlist.getActive.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const addMutation = trpc.waitlist.add.useMutation({
    onSuccess: () => {
      utils.waitlist.getActive.invalidate();
      toast.success("Added to waitlist");
      setShowAddForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const notifyMutation = trpc.waitlist.notify.useMutation({
    onSuccess: () => {
      utils.waitlist.getActive.invalidate();
      toast.success("Guest notified");
    },
    onError: (err) => toast.error(err.message),
  });

  const seatMutation = trpc.waitlist.seat.useMutation({
    onSuccess: () => {
      utils.waitlist.getActive.invalidate();
      toast.success("Guest seated from waitlist");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.waitlist.remove.useMutation({
    onSuccess: () => {
      utils.waitlist.getActive.invalidate();
      toast.info("Removed from waitlist");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <h2 className="text-lg font-bold">Waitlist</h2>
        <Button
          className="h-12 gap-2 text-sm font-semibold"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddToWaitlistForm
          onAdd={(name, phone, partySize) => {
            addMutation.mutate({ name, phone: phone || undefined, partySize });
          }}
          onCancel={() => setShowAddForm(false)}
          isPending={addMutation.isPending}
        />
      )}

      {/* Entries */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ touchAction: "pan-y" }}>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <Armchair className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Waitlist is empty</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => {
              const waitMinutes = differenceInMinutes(now, new Date(entry.createdAt));
              const displayName =
                entry.customer
                  ? `${entry.customer.firstName} ${entry.customer.lastName}`
                  : entry.name ?? "Guest";

              return (
                <div key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Party of {entry.partySize} · {waitMinutes}m wait
                      </p>
                    </div>
                    {entry.status === "NOTIFIED" && (
                      <Badge variant="secondary" className="text-xs">Notified</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {entry.status === "WAITING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 flex-1 gap-1.5 text-xs font-semibold"
                        onClick={() => notifyMutation.mutate({ id: entry.id })}
                        disabled={notifyMutation.isPending}
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Notify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-11 flex-1 gap-1.5 text-xs font-semibold"
                      onClick={() => seatMutation.mutate({ id: entry.id })}
                      disabled={seatMutation.isPending}
                    >
                      <Armchair className="h-3.5 w-3.5" />
                      Seat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 gap-1.5 text-xs text-destructive"
                      onClick={() => removeMutation.mutate({ id: entry.id })}
                      disabled={removeMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add to Waitlist Form ────────────────────────────────────────────────────

function AddToWaitlistForm({
  onAdd,
  onCancel,
  isPending,
}: {
  onAdd: (name: string, phone: string, partySize: number) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [partySize, setPartySize] = React.useState(2);

  return (
    <div className="border-b bg-card p-4 space-y-3 shrink-0">
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 text-base"
          placeholder="Guest name"
          autoFocus
        />
      </div>
      <div>
        <Label className="text-xs">Phone (optional)</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-12 text-base"
          placeholder="+44..."
          type="tel"
        />
      </div>
      <div>
        <Label className="text-xs">Party Size</Label>
        <div className="flex items-center h-12 border rounded-md w-32">
          <button
            className="flex-1 h-full text-xl font-bold active:bg-muted/50"
            onClick={() => setPartySize(Math.max(1, partySize - 1))}
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-lg">{partySize}</span>
          <button
            className="flex-1 h-full text-xl font-bold active:bg-muted/50"
            onClick={() => setPartySize(Math.min(20, partySize + 1))}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1 h-12 text-sm font-semibold"
          disabled={!name.trim() || isPending}
          onClick={() => onAdd(name.trim(), phone.trim(), partySize)}
        >
          {isPending ? "Adding..." : "Add to Waitlist"}
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
