"use client";

import * as React from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { format } from "date-fns";
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
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@bites-rms/ui";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

interface TimeBlock {
  dayOfWeek: (typeof DAYS)[number];
  label: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

function defaultBlocks(): TimeBlock[] {
  return DAYS.map((day) => ({
    dayOfWeek: day,
    label: "default",
    openTime: "09:00",
    closeTime: "23:00",
    isClosed: false,
  }));
}

export default function HoursSettingsPage() {
  const utils = trpc.useUtils();
  const { data: hoursData, isLoading } = trpc.settings.getOperatingHours.useQuery();
  const { data: specialDatesData } = trpc.settings.getSpecialDates.useQuery();

  const upsertMutation = trpc.settings.upsertOperatingHours.useMutation({
    onSuccess: () => {
      utils.settings.getOperatingHours.invalidate();
      toast.success("Operating hours saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const createSpecialDateMutation = trpc.settings.createSpecialDate.useMutation({
    onSuccess: () => {
      utils.settings.getSpecialDates.invalidate();
      toast.success("Special date added");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSpecialDateMutation = trpc.settings.deleteSpecialDate.useMutation({
    onSuccess: () => {
      utils.settings.getSpecialDates.invalidate();
      toast.success("Special date removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const [blocks, setBlocks] = React.useState<TimeBlock[]>(defaultBlocks);
  const [dirty, setDirty] = React.useState(false);

  // Special date form
  const [sdName, setSdName] = React.useState("");
  const [sdDate, setSdDate] = React.useState("");
  const [sdClosed, setSdClosed] = React.useState(true);
  const [sdOpen, setSdOpen] = React.useState("09:00");
  const [sdClose, setSdClose] = React.useState("23:00");

  React.useEffect(() => {
    if (hoursData && hoursData.length > 0) {
      setBlocks(
        hoursData.map((h) => ({
          dayOfWeek: h.dayOfWeek as (typeof DAYS)[number],
          label: h.label,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
      );
      setDirty(false);
    }
  }, [hoursData]);

  function updateBlock(index: number, field: keyof TimeBlock, value: string | boolean) {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value } as TimeBlock;
      return next;
    });
    setDirty(true);
  }

  function addBlock(day: (typeof DAYS)[number]) {
    setBlocks((prev) => [
      ...prev,
      { dayOfWeek: day, label: "dinner", openTime: "18:00", closeTime: "23:00", isClosed: false },
    ]);
    setDirty(true);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function saveHours() {
    upsertMutation.mutate({ hours: blocks });
    setDirty(false);
  }

  function addSpecialDate() {
    if (!sdName || !sdDate) return;
    createSpecialDateMutation.mutate({
      date: sdDate,
      name: sdName,
      isClosed: sdClosed,
      openTime: sdClosed ? null : sdOpen,
      closeTime: sdClosed ? null : sdClose,
    });
    setSdName("");
    setSdDate("");
    setSdClosed(true);
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Group blocks by day
  const blocksByDay = DAYS.map((day) => ({
    day,
    blocks: blocks
      .map((b, idx) => ({ ...b, _idx: idx }))
      .filter((b) => b.dayOfWeek === day),
  }));

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Operating Hours</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set your weekly schedule and special dates.
          </p>
        </div>
        <Button onClick={saveHours} disabled={!dirty || upsertMutation.isPending}>
          {upsertMutation.isPending ? "Saving..." : "Save Hours"}
        </Button>
      </div>

      {/* Weekly Hours */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
          <CardDescription>
            Configure opening hours for each day. Add multiple time blocks for split shifts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {blocksByDay.map(({ day, blocks: dayBlocks }) => (
            <div key={day}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium w-24">{DAY_LABELS[day]}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock(day)}
                  className="text-xs"
                >
                  + Add block
                </Button>
              </div>
              {dayBlocks.length === 0 && (
                <p className="text-sm text-muted-foreground ml-24 mb-2">No hours set (closed)</p>
              )}
              {dayBlocks.map((block) => (
                <div key={block._idx} className="flex items-center gap-3 ml-24 mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={block.isClosed}
                      onCheckedChange={(v) => updateBlock(block._idx, "isClosed", !!v)}
                    />
                    <span className="text-xs text-muted-foreground">Closed</span>
                  </div>
                  {!block.isClosed && (
                    <>
                      <Input
                        type="time"
                        className="w-28"
                        value={block.openTime}
                        onChange={(e) => updateBlock(block._idx, "openTime", e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-28"
                        value={block.closeTime}
                        onChange={(e) => updateBlock(block._idx, "closeTime", e.target.value)}
                      />
                      <Input
                        className="w-24"
                        placeholder="Label"
                        value={block.label}
                        onChange={(e) => updateBlock(block._idx, "label", e.target.value)}
                      />
                    </>
                  )}
                  {dayBlocks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive text-xs px-2"
                      onClick={() => removeBlock(block._idx)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {day !== "SUNDAY" && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Special Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Special Dates</CardTitle>
          <CardDescription>
            Closures, holidays, or modified hours for specific dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={sdDate} onChange={(e) => setSdDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Christmas Day"
                value={sdName}
                onChange={(e) => setSdName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={sdClosed}
                onCheckedChange={(v) => setSdClosed(!!v)}
              />
              <span className="text-sm">Full closure</span>
            </div>
            {!sdClosed && (
              <>
                <Input
                  type="time"
                  className="w-28"
                  value={sdOpen}
                  onChange={(e) => setSdOpen(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="time"
                  className="w-28"
                  value={sdClose}
                  onChange={(e) => setSdClose(e.target.value)}
                />
              </>
            )}
          </div>

          <Button
            onClick={addSpecialDate}
            disabled={!sdName || !sdDate || createSpecialDateMutation.isPending}
            size="sm"
          >
            Add Special Date
          </Button>

          {specialDatesData && specialDatesData.length > 0 && (
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialDatesData.map((sd) => (
                    <TableRow key={sd.id}>
                      <TableCell className="text-sm">
                        {format(new Date(sd.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">{sd.name}</TableCell>
                      <TableCell>
                        {sd.isClosed ? (
                          <Badge variant="destructive">Closed</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {sd.openTime} – {sd.closeTime}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive text-xs"
                          onClick={() => deleteSpecialDateMutation.mutate({ id: sd.id })}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
