"use client";

import { useEffect, useRef, useState } from "react";

// Long enough to be noticed after the arrival settles, short enough that it
// never reads as a persistent selected state. The global prefers-reduced-motion
// clamp in globals.css already flattens the row's colour transition; the delay
// itself is an appearance duration, not motion, so it is deliberately not
// shortened for that preference.
export const ARRIVAL_HIGHLIGHT_MS = 2000;

// The one implementation of "the command palette sent you here — this is the
// row you asked for". Built for TasksSection (2026-08-28), extracted here on
// 2026-09-05 when the Prospects group needed the identical behaviour. A second
// copy would be the same drift class as a hand-copied primitive.
//
// Explicit state keyed to the record id, NOT a one-time imperative DOM query.
// The rows are re-rendered by anything that refetches the list, so a "find the
// node once and style it" approach would silently no-op the moment the list
// re-rendered. State survives that; a stale node reference does not.
//
// `items` may be null while its fetch is in flight — the target's own fields
// (a task's `completed`, say) are only knowable once the rows land, so the
// effect waits rather than firing against an empty list.
//
// `onArrive` runs once for the matched record, before the marker is set, and is
// how a caller reveals a row that is filtered out of view — TasksSection
// switches its Open/Completed tab with it. Held in a ref so a caller passing an
// inline arrow does not re-run the effect (and re-arm the timer) every render.
export function useArrivalHighlight<T extends { id: string }>(
  targetId: string | null | undefined,
  items: T[] | null | undefined,
  onArrive?: (item: T) => void,
): string | null {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const onArriveRef = useRef(onArrive);

  // Declared first, so it has already synced by the time the effect below runs.
  useEffect(() => {
    onArriveRef.current = onArrive;
  });

  useEffect(() => {
    if (!targetId || !items) return;

    const target = items.find((item) => item.id === targetId);
    if (!target) return;

    onArriveRef.current?.(target);
    setHighlightedId(target.id);

    const timer = setTimeout(() => setHighlightedId(null), ARRIVAL_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [targetId, items]);

  return highlightedId;
}
