// Pure state transitions for column resize and reorder. The table primitive's
// hook (`src/components/ui/table-columns.tsx`) owns the pointer handling and the
// DOM measurement; everything that decides a width or an order lives here, so
// it can be tested without a layout engine — jsdom has none.

// Narrow enough to reclaim room, wide enough that no header label or three-
// character cell value collapses under `npm run check:widths`' 24px floor.
export const DEFAULT_MIN_COLUMN_WIDTH = 64;

export function clampWidth(width: number, min: number = DEFAULT_MIN_COLUMN_WIDTH): number {
  if (!Number.isFinite(width)) return min;
  return Math.max(min, Math.round(width));
}

export function resizeColumn<K extends string>(
  widths: Record<K, number>,
  id: K,
  width: number,
  min: number = DEFAULT_MIN_COLUMN_WIDTH,
): Record<K, number> {
  return { ...widths, [id]: clampWidth(width, min) };
}

// Always returns a new array. An out-of-range source is a no-op; an
// out-of-range target is clamped to the nearest end, because a pointer dragged
// past the last header still means "put it last".
export function moveColumn<K>(order: readonly K[], from: number, to: number): K[] {
  const next = [...order];
  if (from < 0 || from >= next.length) return next;
  const target = Math.min(Math.max(to, 0), next.length - 1);
  if (target === from) return next;
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

// The keyboard path: one place left (-1) or right (+1), stopping at the ends.
export function stepColumn<K>(order: readonly K[], id: K, delta: -1 | 1): K[] {
  const from = order.indexOf(id);
  if (from === -1) return [...order];
  const to = from + delta;
  if (to < 0 || to >= order.length) return [...order];
  return moveColumn(order, from, to);
}

// Which header cell a pointer at `x` is over, from the cells' measured edges in
// visual order. Past either end resolves to that end.
export function indexAtPointer(
  cells: readonly { left: number; right: number }[],
  x: number,
): number {
  if (cells.length === 0) return -1;
  if (x < cells[0].left) return 0;
  const index = cells.findIndex((cell) => x >= cell.left && x < cell.right);
  return index === -1 ? cells.length - 1 : index;
}
