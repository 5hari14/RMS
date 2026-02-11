"use client";

import * as React from "react";
import { Button, Input } from "@bites-rms/ui";
import { Plus, Pencil, Trash2, ZoomIn, ZoomOut, Grid3X3 } from "lucide-react";

interface FloorPlanSummary {
  id: string;
  name: string;
  _count: { tables: number };
}

interface Props {
  plans: FloorPlanSummary[];
  activePlanId: string | null;
  onSelectPlan: (id: string) => void;
  onCreatePlan: (name: string) => void;
  onRenamePlan: (id: string, name: string) => void;
  onDeletePlan: (id: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function LayoutToolbar({
  plans,
  activePlanId,
  onSelectPlan,
  onCreatePlan,
  onRenamePlan,
  onDeletePlan,
  zoom,
  onZoomIn,
  onZoomOut,
  snapEnabled,
  onToggleSnap,
  isDirty,
  isSaving,
  onSave,
}: Props) {
  const [showNewInput, setShowNewInput] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreatePlan(newName.trim());
    setNewName("");
    setShowNewInput(false);
  };

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return;
    onRenamePlan(id, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="flex items-center gap-2 border-b bg-background px-4 py-2 shrink-0">
      {/* Layout Selector */}
      <div className="flex items-center gap-1">
        {plans.map((p) => (
          <div key={p.id} className="flex items-center">
            {renamingId === p.id ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(p.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => handleRename(p.id)}
                className="h-7 w-32 text-xs"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelectPlan(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  p.id === activePlanId
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {p.name}
                <span className="ml-1 opacity-60">({p._count.tables})</span>
              </button>
            )}
            {p.id === activePlanId && renamingId !== p.id && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(p.id);
                    setRenameValue(p.name);
                  }}
                  className="ml-0.5 p-1 text-muted-foreground hover:text-foreground"
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete layout "${p.name}"?`))
                      onDeletePlan(p.id);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* New layout */}
      {showNewInput ? (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            placeholder="Layout name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowNewInput(false);
            }}
            className="h-7 w-36 text-xs"
          />
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCreate}>
            Add
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={() => setShowNewInput(true)}
        >
          <Plus className="h-3 w-3" /> New Layout
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Canvas controls */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <button
          type="button"
          onClick={onToggleSnap}
          className={`p-1.5 rounded-md transition-colors ${
            snapEnabled ? "bg-primary/10 text-primary" : "hover:bg-accent"
          }`}
          title={`Grid snap: ${snapEnabled ? "ON" : "OFF"}`}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="p-1.5 rounded-md hover:bg-accent"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono min-w-[3ch] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="p-1.5 rounded-md hover:bg-accent"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Save */}
      <Button
        size="sm"
        className="h-7 text-xs ml-2"
        onClick={onSave}
        disabled={!isDirty || isSaving}
      >
        {isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}
      </Button>
    </div>
  );
}
