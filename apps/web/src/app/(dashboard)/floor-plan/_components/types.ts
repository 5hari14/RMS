export type TableShape = "ROUND" | "SQUARE" | "RECTANGULAR" | "BAR";
export type TableSection = "INDOOR" | "OUTDOOR" | "TERRACE" | "PRIVATE" | "BAR";

export interface FloorTable {
  /** Client-side ID (cuid from DB for existing, or temp ID for new) */
  clientId: string;
  /** DB ID if already persisted */
  dbId?: string;
  number: number;
  name: string | null;
  minCovers: number;
  maxCovers: number;
  shape: TableShape;
  section: TableSection;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
  isAccessible: boolean;
  hasHighChair: boolean;
  /** IDs of tables this is combined with */
  combinedWith: string[];
}

export interface PaletteTemplate {
  label: string;
  shape: TableShape;
  minCovers: number;
  maxCovers: number;
  width: number;
  height: number;
}

export const PALETTE_TEMPLATES: PaletteTemplate[] = [
  { label: "Round (2)", shape: "ROUND", minCovers: 1, maxCovers: 2, width: 60, height: 60 },
  { label: "Round (4)", shape: "ROUND", minCovers: 2, maxCovers: 4, width: 80, height: 80 },
  { label: "Square (4)", shape: "SQUARE", minCovers: 2, maxCovers: 4, width: 80, height: 80 },
  { label: "Rect (6)", shape: "RECTANGULAR", minCovers: 4, maxCovers: 6, width: 120, height: 80 },
  { label: "Rect (8)", shape: "RECTANGULAR", minCovers: 6, maxCovers: 8, width: 160, height: 80 },
  { label: "Bar (1)", shape: "BAR", minCovers: 1, maxCovers: 1, width: 40, height: 40 },
];

export const GRID_SIZE = 20;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export const SECTION_OPTIONS: { value: TableSection; label: string }[] = [
  { value: "INDOOR", label: "Indoor" },
  { value: "OUTDOOR", label: "Outdoor" },
  { value: "TERRACE", label: "Terrace" },
  { value: "PRIVATE", label: "Private Room" },
  { value: "BAR", label: "Bar" },
];

export const SHAPE_OPTIONS: { value: TableShape; label: string }[] = [
  { value: "ROUND", label: "Round" },
  { value: "SQUARE", label: "Square" },
  { value: "RECTANGULAR", label: "Rectangular" },
  { value: "BAR", label: "Bar Seat" },
];
