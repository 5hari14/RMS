"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { trpc } from "@/trpc/client";
import type { FloorTable, PaletteTemplate } from "./types";
import { snapToGrid } from "./types";
import { TablePalette } from "./table-palette";
import { FloorCanvas } from "./floor-canvas";
import { TableProperties } from "./table-properties";
import { LayoutToolbar } from "./layout-toolbar";

let nextTempId = 1;
function tempId(): string {
  return `temp_${Date.now()}_${nextTempId++}`;
}

export function FloorPlanEditor() {
  const utils = trpc.useUtils();

  // ─── State ──────────────────────────────────────────────────────────
  const [activePlanId, setActivePlanId] = React.useState<string | null>(null);
  const [tables, setTables] = React.useState<FloorTable[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [zoom, setZoom] = React.useState(1);
  const [snapEnabled, setSnapEnabled] = React.useState(true);
  const [isDirty, setIsDirty] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null!);
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────
  const plansQuery = trpc.floorPlan.list.useQuery();
  const planDetailQuery = trpc.floorPlan.getById.useQuery(
    { id: activePlanId! },
    { enabled: !!activePlanId },
  );

  // ─── Mutations ──────────────────────────────────────────────────────
  const createPlanMutation = trpc.floorPlan.create.useMutation({
    onSuccess: (plan) => {
      utils.floorPlan.list.invalidate();
      setActivePlanId(plan.id);
    },
  });

  const renamePlanMutation = trpc.floorPlan.rename.useMutation({
    onSuccess: () => utils.floorPlan.list.invalidate(),
  });

  const deletePlanMutation = trpc.floorPlan.delete.useMutation({
    onSuccess: () => {
      utils.floorPlan.list.invalidate();
      setActivePlanId(null);
      setTables([]);
      setSelectedIds(new Set());
    },
  });

  const saveTablesMutation = trpc.floorPlan.saveTables.useMutation({
    onSuccess: (savedTables) => {
      setIsDirty(false);
      // Remap temp IDs to real DB IDs
      setTables((prev) => {
        const newTables: FloorTable[] = [];
        for (let i = 0; i < prev.length; i++) {
          const saved = savedTables[i];
          if (saved) {
            newTables.push({
              ...prev[i]!,
              clientId: saved.id,
              dbId: saved.id,
            });
          }
        }
        return newTables;
      });
      utils.floorPlan.getById.invalidate({ id: activePlanId! });
    },
  });

  // ─── Load plan tables when plan detail arrives ──────────────────────
  React.useEffect(() => {
    if (planDetailQuery.data) {
      setTables(
        planDetailQuery.data.tables.map((t) => ({
          clientId: t.id,
          dbId: t.id,
          number: t.number,
          name: t.name,
          minCovers: t.minCovers,
          maxCovers: t.maxCovers,
          shape: t.shape,
          section: t.section,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          isActive: t.isActive,
          isAccessible: t.isAccessible,
          hasHighChair: t.hasHighChair,
          combinedWith: [],
        })),
      );
      setSelectedIds(new Set());
      setIsDirty(false);
    }
  }, [planDetailQuery.data]);

  // Auto-select first plan
  React.useEffect(() => {
    if (plansQuery.data && plansQuery.data.length > 0 && !activePlanId) {
      setActivePlanId(plansQuery.data[0]!.id);
    }
  }, [plansQuery.data, activePlanId]);

  // ─── Auto-save every 30s ────────────────────────────────────────────
  React.useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty && activePlanId && !saveTablesMutation.isPending) {
        handleSave();
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
    // Intentionally not including handleSave in deps to avoid re-creating interval
  }, [isDirty, activePlanId, tables]);

  // ─── DnD Setup ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Track the template being dragged from palette
  const [draggingTemplate, setDraggingTemplate] =
    React.useState<PaletteTemplate | null>(null);

  const handleDragStart = React.useCallback(
    (event: { active: { data: { current?: { type?: string; template?: PaletteTemplate } } } }) => {
      const data = event.active.data.current;
      if (data?.type === "palette" && data.template) {
        setDraggingTemplate(data.template);
      }
    },
    [],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      setDraggingTemplate(null);
      const data = event.active.data.current as
        | { type: string; template: PaletteTemplate }
        | undefined;
      if (data?.type !== "palette" || !data.template) return;

      // Calculate drop position on canvas
      if (!canvasRef.current) return;

      const template = data.template;
      const delta = event.delta;

      // Use the palette item's original position + delta to estimate canvas position
      const rect = canvasRef.current.getBoundingClientRect();
      const activeRect = event.activatorEvent as MouseEvent;
      if (!activeRect) return;

      let dropX =
        (activeRect.clientX + delta.x - rect.left + canvasRef.current.scrollLeft) / zoom -
        template.width / 2;
      let dropY =
        (activeRect.clientY + delta.y - rect.top + canvasRef.current.scrollTop) / zoom -
        template.height / 2;

      if (snapEnabled) {
        dropX = snapToGrid(dropX);
        dropY = snapToGrid(dropY);
      }

      addTableFromTemplate(template, Math.max(0, dropX), Math.max(0, dropY));
    },
    [zoom, snapEnabled],
  );

  // ─── Table operations ───────────────────────────────────────────────

  const getNextTableNumber = React.useCallback(() => {
    if (tables.length === 0) return 1;
    return Math.max(...tables.map((t) => t.number)) + 1;
  }, [tables]);

  const addTableFromTemplate = React.useCallback(
    (template: PaletteTemplate, x: number, y: number) => {
      const newTable: FloorTable = {
        clientId: tempId(),
        number: getNextTableNumber(),
        name: null,
        minCovers: template.minCovers,
        maxCovers: template.maxCovers,
        shape: template.shape,
        section: "INDOOR",
        x,
        y,
        width: template.width,
        height: template.height,
        isActive: true,
        isAccessible: false,
        hasHighChair: false,
        combinedWith: [],
      };
      setTables((prev) => [...prev, newTable]);
      setSelectedIds(new Set([newTable.clientId]));
      setIsDirty(true);
    },
    [getNextTableNumber],
  );

  const handleSelectTable = React.useCallback(
    (id: string, additive: boolean) => {
      setSelectedIds((prev) => {
        if (additive) {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }
        return new Set([id]);
      });
    },
    [],
  );

  const handleMoveTable = React.useCallback(
    (id: string, x: number, y: number) => {
      setTables((prev) =>
        prev.map((t) => (t.clientId === id ? { ...t, x, y } : t)),
      );
      setIsDirty(true);
    },
    [],
  );

  const handleUpdateTable = React.useCallback(
    (id: string, updates: Partial<FloorTable>) => {
      setTables((prev) =>
        prev.map((t) => (t.clientId === id ? { ...t, ...updates } : t)),
      );
      setIsDirty(true);
    },
    [],
  );

  const handleDeleteTable = React.useCallback(
    (id: string) => {
      setTables((prev) => {
        // Remove from combined lists
        const filtered = prev
          .filter((t) => t.clientId !== id)
          .map((t) => ({
            ...t,
            combinedWith: t.combinedWith.filter((cid) => cid !== id),
          }));
        return filtered;
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setIsDirty(true);
    },
    [],
  );

  const handleCombine = React.useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length < 2) return;
    setTables((prev) =>
      prev.map((t) => {
        if (selectedIds.has(t.clientId)) {
          return {
            ...t,
            combinedWith: ids.filter((id) => id !== t.clientId),
          };
        }
        return t;
      }),
    );
    setIsDirty(true);
  }, [selectedIds]);

  const handleUncombine = React.useCallback(
    (tableId: string) => {
      const table = tables.find((t) => t.clientId === tableId);
      if (!table) return;
      const groupIds = [tableId, ...table.combinedWith];
      setTables((prev) =>
        prev.map((t) => {
          if (groupIds.includes(t.clientId)) {
            return { ...t, combinedWith: [] };
          }
          return t;
        }),
      );
      setIsDirty(true);
    },
    [tables],
  );

  const handleDeselectAll = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Save ───────────────────────────────────────────────────────────

  const handleSave = React.useCallback(() => {
    if (!activePlanId) return;
    saveTablesMutation.mutate({
      floorPlanId: activePlanId,
      tables: tables.map((t) => ({
        id: t.dbId,
        number: t.number,
        name: t.name,
        minCovers: t.minCovers,
        maxCovers: t.maxCovers,
        shape: t.shape,
        section: t.section,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        isActive: t.isActive,
        isAccessible: t.isAccessible,
        hasHighChair: t.hasHighChair,
      })),
    });
  }, [activePlanId, tables, saveTablesMutation]);

  // ─── Selected table for properties panel ────────────────────────────
  const selectedTable = React.useMemo(() => {
    if (selectedIds.size === 0) return null;
    // Show properties for the last selected
    const ids = [...selectedIds];
    return tables.find((t) => t.clientId === ids[ids.length - 1]) ?? null;
  }, [selectedIds, tables]);

  const plans = plansQuery.data ?? [];

  // ─── Keyboard shortcuts ─────────────────────────────────────────────
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is typing in an input
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
          return;
        for (const id of selectedIds) {
          handleDeleteTable(id);
        }
      }
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, handleDeleteTable, handleSave]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <LayoutToolbar
          plans={plans}
          activePlanId={activePlanId}
          onSelectPlan={(id) => {
            setActivePlanId(id);
            setIsDirty(false);
          }}
          onCreatePlan={(name) => createPlanMutation.mutate({ name })}
          onRenamePlan={(id, name) => renamePlanMutation.mutate({ id, name })}
          onDeletePlan={(id) => deletePlanMutation.mutate({ id })}
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(2, z + 0.1))}
          onZoomOut={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          isDirty={isDirty}
          isSaving={saveTablesMutation.isPending}
          onSave={handleSave}
        />

        <div className="flex flex-1 min-h-0">
          <TablePalette />

          {activePlanId ? (
            <FloorCanvas
              tables={tables}
              selectedIds={selectedIds}
              zoom={zoom}
              snapEnabled={snapEnabled}
              onSelectTable={handleSelectTable}
              onMoveTable={handleMoveTable}
              onDeselectAll={handleDeselectAll}
              canvasRef={canvasRef as React.RefObject<HTMLDivElement>}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {plans.length === 0
                ? 'Create your first layout by clicking "+ New Layout" above'
                : "Select a layout to start editing"}
            </div>
          )}

          {selectedTable && (
            <TableProperties
              table={selectedTable}
              onUpdate={(updates) =>
                handleUpdateTable(selectedTable.clientId, updates)
              }
              onDelete={() => handleDeleteTable(selectedTable.clientId)}
              selectedCount={selectedIds.size}
              isCombined={selectedTable.combinedWith.length > 0}
              onCombine={handleCombine}
              onUncombine={() => handleUncombine(selectedTable.clientId)}
            />
          )}
        </div>
      </div>

      <DragOverlay>
        {draggingTemplate && (
          <div
            style={{
              width: draggingTemplate.width,
              height: draggingTemplate.height,
              borderRadius: draggingTemplate.shape === "ROUND" ? "50%" : 4,
              background: "hsl(215 60% 55%)",
              opacity: 0.7,
              border: "2px solid hsl(var(--ring))",
            }}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
