"use client";

import { useDraggable } from "@dnd-kit/core";
import { PALETTE_TEMPLATES, type PaletteTemplate } from "./types";

function PaletteItem({ template, index }: { template: PaletteTemplate; index: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${index}`,
      data: { type: "palette", template },
    });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors select-none"
    >
      <ShapePreview shape={template.shape} size={28} />
      <div>
        <div className="font-medium text-xs">{template.label}</div>
        <div className="text-[10px] text-muted-foreground">
          {template.minCovers}-{template.maxCovers} seats
        </div>
      </div>
    </div>
  );
}

function ShapePreview({
  shape,
  size,
}: {
  shape: PaletteTemplate["shape"];
  size: number;
}) {
  const cls = "border-2 border-primary/60 bg-primary/10";
  switch (shape) {
    case "ROUND":
      return (
        <div className={cls} style={{ width: size, height: size, borderRadius: "50%" }} />
      );
    case "SQUARE":
      return (
        <div className={cls} style={{ width: size, height: size, borderRadius: 4 }} />
      );
    case "RECTANGULAR":
      return (
        <div
          className={cls}
          style={{ width: size * 1.5, height: size, borderRadius: 4 }}
        />
      );
    case "BAR":
      return (
        <div
          className={cls}
          style={{ width: size * 0.8, height: size * 0.8, borderRadius: 2 }}
        />
      );
  }
}

export function TablePalette() {
  return (
    <div className="w-52 shrink-0 border-r bg-muted/20 p-3 space-y-2 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
        Add Table
      </h3>
      {PALETTE_TEMPLATES.map((t, i) => (
        <PaletteItem key={i} template={t} index={i} />
      ))}
      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        Drag onto the canvas to place. Click a table to edit properties.
      </p>
    </div>
  );
}
