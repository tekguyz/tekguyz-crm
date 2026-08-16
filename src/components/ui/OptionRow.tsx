"use client";

import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// A full-width row in a listbox: the command palette's result rows today.
//
// It is a `div role="option"`, NOT a button, and that is the point. In the
// combobox pattern the input keeps DOM focus the whole time and points at the
// active row with aria-activedescendant, so the rows must not be focusable —
// a list of buttons would put eight extra tab stops between the query field
// and everything after it, and would tell a screen reader "button" where the
// user is being offered a choice from a list.
//
// `selected` is the palette's roving highlight, driven by the arrow keys and
// by hover. It scrolls itself into view because the list can be taller than
// its scroll container and a keyboard user would otherwise be moving a
// highlight they cannot see.
export function OptionRow({
  selected = false,
  className,
  ...props
}: Omit<ComponentProps<"div">, "role" | "aria-selected"> & {
  selected?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex w-full cursor-default flex-col rounded-md px-3 py-2 text-left transition-colors",
        selected && "bg-canvas-soft",
        className,
      )}
      {...props}
    />
  );
}
