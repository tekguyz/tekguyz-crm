"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";

// Fourth Radix overlay primitive in the app, same recipe as alert-dialog.tsx,
// dialog.tsx and popover.tsx: shadcn's current structure copied by hand, the
// Radix primitive kept underneath, the "data-slot" convention kept, and every
// class remapped onto this project's own OKLCH tokens. shadcn's defaults
// (bg-popover, text-muted-foreground, shadow-md) never ship here.
//
// Elevation is Level 1. Under Design System v2 the ramp carries meaning:
// Level 1 is popovers and dropdowns, Level 2 is modals and the command
// palette. This is a dropdown.
//
// Deliberately partial. shadcn's dropdown-menu also exports Group, Portal,
// CheckboxItem, Shortcut, Sub, SubTrigger and SubContent; none has a consumer
// in this app, and a part with no caller is scope creep. Add one by copying
// its structure from the live registry when something actually needs it.
//
// The check mark is Tabler, not lucide — lucide-react was fully removed on
// 2026-08-14.

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border border-hairline bg-canvas-pure p-1 text-ink-main shadow-elevation-1 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

// `focus:` rather than `hover:` is Radix's own convention here: the menu moves
// DOM focus as the pointer moves, so one rule covers mouse and keyboard and
// the two can never disagree about which row is highlighted.
//
// shadcn's version also carries `outline-none`, and that class is deliberately
// NOT copied. It would delete this app's accessibility floor — the global
// `:focus-visible` rule in globals.css — for every menu row, leaving the
// background tint as the only signal that a row is selected. On the dark
// canvas that tint is canvas-soft on canvas-pure, which is close to invisible,
// and the identity menu is where the theme choices, Help and sign out now
// live: five keyboard-driven controls with no ring between them.
//
// Dropping it is safe for pointer users rather than noisy, because Radix
// highlights a row by calling .focus() on pointermove. Chromium only matches
// :focus-visible on a programmatic focus when the last input was a keyboard,
// so the ring paints on arrow-key navigation and stays off under the mouse —
// which is the behaviour `outline-none` was reaching for in the first place.
const ITEM_CLASS =
  "text-body-md relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 select-none focus:bg-canvas-soft data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "danger";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        ITEM_CLASS,
        "data-[variant=danger]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(ITEM_CLASS, "pr-8", className)}
      {...props}
    >
      {children}
      {/* Trailing rather than shadcn's leading indicator: these rows carry a
          leading icon of their own, and two glyphs competing on the left edge
          would read as one ragged column. */}
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-accent">
        <DropdownMenuPrimitive.ItemIndicator>
          <IconCheck className="size-4" stroke={2} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-hairline", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
};
