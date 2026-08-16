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
// Bottom edge only, deliberately. shadcn's version takes side="top|right|
// bottom|left"; the live consumer here is the mobile "More" sheet, which is a
// thumb-reachable bottom sheet, and the app's right-hand drawers are already
// served by dialog.tsx and the Profile Sheet. Add a `side` prop when a real
// caller needs another edge, not before.

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

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          // pb-[env(safe-area-inset-bottom)] keeps the last row clear of the
          // iOS home indicator, which overlaps a flush-to-edge bottom sheet.
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col gap-4 overflow-y-auto rounded-t-xl border-t border-hairline bg-canvas-pure p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink-main shadow-elevation-2 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
        >
          <IconX className="size-4" stroke={1.75} />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
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
