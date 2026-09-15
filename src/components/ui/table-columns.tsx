"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { IconGripVertical } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_MIN_COLUMN_WIDTH,
  clampWidth,
  indexAtPointer,
  moveColumn,
  resizeColumn,
  stepColumn,
} from "@/lib/table/column-layout";

// Opt-in column resize and reorder for the Table shell in `TableRow.tsx`. The
// shell itself stays bare: a table that never calls `useColumnLayout` renders
// exactly as before, which is what StageLedger, the importers and `/design`
// rely on.
//
// Session-only by design. Width and order are React state and reset on reload;
// persisting them is its own registered gap in docs/KNOWN_GAPS.md.
//
// Pointer events with capture, not the HTML5 drag-and-drop API: native DnD
// paints a ghost image, fights text selection inside header buttons, and does
// not fire under a scripted real-pointer drag in the Browser pane.

export type ColumnSpec<K extends string> = {
  id: K;
  minWidth?: number;
  resizable?: boolean;
};

const KEYBOARD_RESIZE_STEP = 16;

export type ColumnLayout<K extends string> = {
  order: K[];
  // Null until the first resize. Until then the table keeps auto layout, so a
  // table nobody resizes looks identical to one that cannot be resized.
  widths: Record<K, number> | null;
  headerRowRef: RefObject<HTMLTableRowElement | null>;
  dragging: { id: K; overIndex: number } | null;
  resizing: K | null;
  specFor: (id: K) => ColumnSpec<K>;
  startResize: (id: K, event: PointerEvent<HTMLElement>) => void;
  nudgeWidth: (id: K, delta: number) => void;
  startReorder: (id: K, event: PointerEvent<HTMLElement>) => void;
  stepOrder: (id: K, delta: -1 | 1) => void;
};

export function useColumnLayout<K extends string>(
  columns: readonly ColumnSpec<K>[],
): ColumnLayout<K> {
  const [order, setOrder] = useState<K[]>(() => columns.map((column) => column.id));
  const [widths, setWidths] = useState<Record<K, number> | null>(null);
  const [dragging, setDragging] = useState<{ id: K; overIndex: number } | null>(null);
  const [resizing, setResizing] = useState<K | null>(null);
  const headerRowRef = useRef<HTMLTableRowElement>(null);

  const specFor = useCallback(
    (id: K) => columns.find((column) => column.id === id) ?? { id },
    [columns],
  );

  // Header cells in visual order, read from the DOM rather than from `order`,
  // so a measurement can never be attributed to the wrong column.
  const measureCells = useCallback(() => {
    const row = headerRowRef.current;
    if (!row) return [];
    return [...row.querySelectorAll<HTMLElement>(":scope > th[data-column-id]")].map(
      (cell) => ({ id: cell.dataset.columnId as K, rect: cell.getBoundingClientRect() }),
    );
  }, []);

  // The first resize freezes every column at its current rendered width, then
  // switches the table to fixed layout. Seeding only the dragged column would
  // let the browser redistribute the rest and make the others jump.
  const seedWidths = useCallback((): Record<K, number> => {
    if (widths) return widths;
    const seeded = {} as Record<K, number>;
    for (const { id, rect } of measureCells()) {
      seeded[id] = clampWidth(rect.width, specFor(id).minWidth ?? DEFAULT_MIN_COLUMN_WIDTH);
    }
    setWidths(seeded);
    return seeded;
  }, [widths, measureCells, specFor]);

  const startResize = useCallback(
    (id: K, event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = seedWidths()[id];
      const min = specFor(id).minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
      setResizing(id);

      const onMove = (move: globalThis.PointerEvent) => {
        setWidths((current) =>
          resizeColumn(current ?? ({} as Record<K, number>), id, startWidth + move.clientX - startX, min),
        );
      };
      const onEnd = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onEnd);
        handle.removeEventListener("pointercancel", onEnd);
        setResizing(null);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onEnd);
      handle.addEventListener("pointercancel", onEnd);
    },
    [seedWidths, specFor],
  );

  const nudgeWidth = useCallback(
    (id: K, delta: number) => {
      const seeded = seedWidths();
      const min = specFor(id).minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
      setWidths(resizeColumn(seeded, id, seeded[id] + delta, min));
    },
    [seedWidths, specFor],
  );

  const startReorder = useCallback(
    (id: K, event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const from = measureCells().findIndex((cell) => cell.id === id);
      if (from === -1) return;
      let overIndex = from;
      setDragging({ id, overIndex });

      const onMove = (move: globalThis.PointerEvent) => {
        const edges = measureCells().map(({ rect }) => ({ left: rect.left, right: rect.right }));
        const next = indexAtPointer(edges, move.clientX);
        if (next !== -1 && next !== overIndex) {
          overIndex = next;
          setDragging({ id, overIndex });
        }
      };
      const onEnd = (end: globalThis.PointerEvent) => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onEnd);
        handle.removeEventListener("pointercancel", onEnd);
        setDragging(null);
        if (end.type === "pointerup" && overIndex !== from) {
          setOrder((current) => moveColumn(current, current.indexOf(id), overIndex));
        }
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onEnd);
      handle.addEventListener("pointercancel", onEnd);
    },
    [measureCells],
  );

  const stepOrder = useCallback((id: K, delta: -1 | 1) => {
    setOrder((current) => stepColumn(current, id, delta));
  }, []);

  return {
    order,
    widths,
    headerRowRef,
    dragging,
    resizing,
    specFor,
    startResize,
    nudgeWidth,
    startReorder,
    stepOrder,
  };
}

// Props for the <Table> of a layout-aware table. Fixed layout and an explicit
// total width only once something has been resized; `w-auto` replaces the
// shell's `w-full` so a narrowed table does not stretch its columns back out.
export function columnTableProps<K extends string>(layout: ColumnLayout<K>) {
  if (!layout.widths) return {};
  const widths = layout.widths;
  const total = layout.order.reduce((sum, id) => sum + (widths[id] ?? 0), 0);
  return {
    className: "w-auto table-fixed",
    style: { width: total },
  };
}

// Rendered as the first child of <Table>. Nothing until the first resize.
export function TableColumnGroup<K extends string>({ layout }: { layout: ColumnLayout<K> }) {
  if (!layout.widths) return null;
  const widths = layout.widths;
  return (
    <colgroup>
      {layout.order.map((id) => (
        <col key={id} style={{ width: widths[id] }} />
      ))}
    </colgroup>
  );
}

// Spread onto each <TableHeaderCell>. `data-column-id` is how the hook finds
// the cells; the two data attributes drive the drag styling below.
export function columnHeaderProps<K extends string>(layout: ColumnLayout<K>, id: K) {
  const index = layout.order.indexOf(id);
  const drag = layout.dragging;
  const from = drag ? layout.order.indexOf(drag.id) : -1;
  const isTarget = drag !== null && drag.overIndex === index && index !== from;
  return {
    "data-column-id": id,
    "data-dragging": drag?.id === id ? "true" : undefined,
    "data-drop": isTarget ? (index > from ? "after" : "before") : undefined,
    className: cn(
      "relative",
      drag?.id === id && "bg-canvas-soft",
      // A neutral ink bar on the edge the column will land against. Not
      // --accent: this is transient structure, not a CTA or a link.
      isTarget && index < from && "shadow-[inset_2px_0_0_var(--ink-main)]",
      isTarget && index > from && "shadow-[inset_-2px_0_0_var(--ink-main)]",
    ),
  };
}

export function ColumnReorderHandle<K extends string>({
  layout,
  id,
  label,
}: {
  layout: ColumnLayout<K>;
  id: K;
  label: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      layout.stepOrder(id, event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Move ${label} column. Use left and right arrow keys.`}
      title={`Drag to move ${label}`}
      className="-ml-2 cursor-grab touch-none px-1 active:cursor-grabbing"
      onPointerDown={(event) => layout.startReorder(id, event)}
      onKeyDown={onKeyDown}
    >
      <IconGripVertical className="size-3.5 opacity-50" stroke={1.75} aria-hidden="true" />
    </Button>
  );
}

// A focusable vertical separator on the header cell's trailing edge. The hit
// area is 8px wide; the visible hairline inside it is 1px and darkens while
// hovered, focused or dragging.
export function ColumnResizeHandle<K extends string>({
  layout,
  id,
  label,
}: {
  layout: ColumnLayout<K>;
  id: K;
  label: string;
}) {
  const width = layout.widths?.[id];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      layout.nudgeWidth(id, event.key === "ArrowLeft" ? -KEYBOARD_RESIZE_STEP : KEYBOARD_RESIZE_STEP);
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      aria-valuenow={width}
      aria-valuemin={layout.specFor(id).minWidth ?? DEFAULT_MIN_COLUMN_WIDTH}
      tabIndex={0}
      data-resizing={layout.resizing === id ? "true" : undefined}
      onPointerDown={(event) => layout.startResize(id, event)}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 -right-1 z-10 flex w-2 cursor-col-resize touch-none justify-center"
    >
      <span
        aria-hidden="true"
        className="h-full w-px bg-hairline transition-colors group-hover:bg-ink-muted group-focus-visible:bg-ink-main group-data-[resizing=true]:bg-ink-main"
      />
    </div>
  );
}
