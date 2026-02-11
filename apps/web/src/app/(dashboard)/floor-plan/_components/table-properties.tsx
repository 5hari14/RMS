"use client";

import { Input, Label, Button, Checkbox, Separator } from "@bites-rms/ui";
import type { FloorTable } from "./types";
import { SECTION_OPTIONS, SHAPE_OPTIONS } from "./types";

interface Props {
  table: FloorTable;
  onUpdate: (updates: Partial<FloorTable>) => void;
  onDelete: () => void;
  /** Multiple selected — show combine button */
  selectedCount: number;
  isCombined: boolean;
  onCombine: () => void;
  onUncombine: () => void;
}

export function TableProperties({
  table,
  onUpdate,
  onDelete,
  selectedCount,
  isCombined,
  onCombine,
  onUncombine,
}: Props) {
  return (
    <div className="w-60 shrink-0 border-l bg-muted/20 p-4 overflow-y-auto space-y-4">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
        Table Properties
      </h3>

      <div>
        <Label className="text-xs">Table Number</Label>
        <Input
          type="number"
          min={1}
          value={table.number}
          onChange={(e) => onUpdate({ number: parseInt(e.target.value, 10) || 1 })}
          className="h-8 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">Name (optional)</Label>
        <Input
          value={table.name ?? ""}
          onChange={(e) => onUpdate({ name: e.target.value || null })}
          placeholder="e.g. Window seat"
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Min Covers</Label>
          <Input
            type="number"
            min={1}
            value={table.minCovers}
            onChange={(e) =>
              onUpdate({ minCovers: parseInt(e.target.value, 10) || 1 })
            }
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Max Covers</Label>
          <Input
            type="number"
            min={1}
            value={table.maxCovers}
            onChange={(e) =>
              onUpdate({ maxCovers: parseInt(e.target.value, 10) || 1 })
            }
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Shape</Label>
        <select
          value={table.shape}
          onChange={(e) => onUpdate({ shape: e.target.value as FloorTable["shape"] })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {SHAPE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-xs">Section</Label>
        <select
          value={table.section}
          onChange={(e) =>
            onUpdate({ section: e.target.value as FloorTable["section"] })
          }
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {SECTION_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Separator />

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={table.isAccessible}
            onCheckedChange={(v) => onUpdate({ isAccessible: v === true })}
          />
          Accessible
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={table.hasHighChair}
            onCheckedChange={(v) => onUpdate({ hasHighChair: v === true })}
          />
          High Chair
        </label>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            min={20}
            step={20}
            value={table.width}
            onChange={(e) =>
              onUpdate({ width: parseInt(e.target.value, 10) || 60 })
            }
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            min={20}
            step={20}
            value={table.height}
            onChange={(e) =>
              onUpdate({ height: parseInt(e.target.value, 10) || 60 })
            }
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Combine / Uncombine */}
      {selectedCount >= 2 && !isCombined && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onCombine}
        >
          Combine {selectedCount} Tables
        </Button>
      )}
      {isCombined && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onUncombine}
        >
          Uncombine Tables
        </Button>
      )}

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={onDelete}
      >
        Delete Table
      </Button>
    </div>
  );
}
