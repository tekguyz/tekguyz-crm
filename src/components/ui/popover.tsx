"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils/cn";

// Third Radix overlay primitive in the app, same recipe as alert-dialog.tsx
// and dialog.tsx: Radix primitives, "data-slot" convention, this app's own
// OKLCH tokens, and tw-animate-css driven off Radix's data-state.
//
// Popover specifically (rather than a hand-rolled absolute-positioned div)
// for its collision detection — anchors near a viewport edge, like the API
// Keys panel at the bottom of a scrolled Settings page, get flipped/shifted
// back on-screen automatically.
//
// Elevation is Level 1, not Level 2. Under Design System v2 the ramp carries
// meaning: Level 1 is popovers and dropdowns, Level 2 is reserved for modals
// and the command palette. A popover sharing the modal's shadow would flatten
// that distinction and make a transient hint read as heavy as a blocking
// dialog.

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-50 w-72 rounded-md border border-hairline bg-canvas-pure p-3 text-ink-main shadow-elevation-1 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
