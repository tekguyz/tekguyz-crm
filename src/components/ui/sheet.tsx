"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";

// Sixth Radix overlay primitive, same recipe as the other five. Built on
// @radix-ui/react-dialog, which shadcn's sheet also uses and which this app
// already depends on — a sheet is a dialog that arrives from an edge.
//
// Elevation is Level 2: it dims the page behind it and traps focus, so it is a
// modal in every sense that the ramp cares about, and Level 1 would make a
// blocking surface read as light as a hint.
//
// TWO EDGES NOW, because a real caller arrived. This file used to say "bottom
// edge only … add a `side` prop when a real caller needs another edge, not
// before" — Shell/IA Stage 2 is that caller. The lead read panel (ProfileSheet)
// and the lead edit drawer (EditLeadDrawer) are both right-edge panels sharing
// one slot, and before this they were a hand-rolled createPortal + motion panel
// and a native <dialog> respectively: two containers, two width caps, no focus
// trap on one of them. They are one primitive now.
//
// `side` defaults to "bottom", so the pre-existing consumer — the mobile "More"
// sheet — is byte-for-byte unchanged in behaviour.
//
// The two sides genuinely differ in more than a direction, which is why the
// class sets are separate rather than one string with a variant appended:
// the bottom sheet pads and scrolls itself (it holds a short list), while a
// right panel owns its own header, scroller and pinned footer and must NOT be
// given padding, a gap or an overflow of its own — its child is a flex column
// that manages all three.
//
// `showClose` follows from that: the bottom sheet gets the primitive's own
// floating close button, a right panel puts its close control in its header
// row where it belongs, so the default is "bottom only". Two close buttons
// would both be real and one would be unreachable behind the header.

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-ink-main/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export type SheetSide = "bottom" | "right";

const SIDES: Record<SheetSide, string> = {
  // pb-[env(safe-area-inset-bottom)] keeps the last row clear of the iOS home
  // indicator, which overlaps a flush-to-edge bottom sheet.
  bottom:
    "inset-x-0 bottom-0 max-h-[85svh] gap-4 overflow-y-auto rounded-t-xl border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  // No padding, no gap, no overflow: a right panel's child is a flex column
  // that owns its own header, scroller and pinned footer. `w-full` with no cap
  // is the phone case; callers add their width ramp through className, which
  // for the two lead panels is the shared LEAD_PANEL_WIDTH constant.
  right:
    "inset-y-0 right-0 w-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
};

function SheetContent({
  className,
  children,
  side = "bottom",
  showClose = side === "bottom",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide;
  showClose?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col border-hairline bg-canvas-pure text-ink-main shadow-elevation-2 data-[state=closed]:animate-out data-[state=open]:animate-in",
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
          >
            <IconX className="size-4" stroke={1.75} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-h2", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body-md text-ink-muted", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
