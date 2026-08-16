"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils/cn";

// Fifth Radix overlay primitive, same recipe as alert-dialog.tsx, dialog.tsx,
// popover.tsx and dropdown-menu.tsx.
//
// Two deliberate departures from shadcn's current tooltip:
//
// 1. No inverted surface. shadcn paints bg-foreground / text-background, which
//    would put a solid near-black slab on a light canvas and a solid white one
//    on dark. Design System v2 builds structure from hairline borders, so this
//    matches popover.tsx exactly — canvas-pure, hairline, Level 1 — and reads
//    as part of the same system rather than as a foreign chip.
// 2. No arrow, for the same reason: a filled arrow needs a solid fill and
//    cannot carry the hairline border across its own edges without seams.
//
// The live consumer is the collapsed sidebar rail, where a nav item's label is
// visually hidden and hover/focus has to reveal it.

function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "text-body-sm z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md border border-hairline bg-canvas-pure px-2 py-1 text-ink-main text-balance shadow-elevation-1 data-[state=closed]:animate-out data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
