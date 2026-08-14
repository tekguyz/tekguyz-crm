"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils/cn";
import { ModalPortalContext } from "@/components/ui/Modal";

// Standard shadcn/ui alert-dialog structure (Radix primitives, "data-slot"
// convention), styled with this app's own design tokens (canvas-pure,
// hairline, ink-main, accent, shadow-elevation-2) instead of shadcn's
// default CSS variables — same override relationship every other piece of
// this app's UI has with its underlying library defaults.

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-ink-main/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  // See ModalPortalContext's own comment (Modal.tsx) — portals into the
  // enclosing native <dialog> when nested inside one, since that dialog's
  // top-layer promotion would otherwise render a document.body portal
  // invisibly behind it. undefined (Radix's own default: document.body)
  // when not nested inside our Modal.
  const modalDialog = React.useContext(ModalPortalContext);
  return (
    <AlertDialogPortal container={modalDialog ?? undefined}>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-hairline bg-canvas-pure p-4 text-ink-main shadow-elevation-2 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-h2", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-body-md text-ink-muted", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      // Mirrors Button's `primary` variant: Level 0, hairline-or-transparent
      // border, no shadow. v1 gave this a Level-1 shadow that grew to Level 2
      // on hover; under v2 elevation is reserved for popovers and modals, and a
      // button inside a modal is not itself elevated. Radix needs its own props
      // forwarded onto the element, so this restates Button's classes rather
      // than composing it.
      //
      // text-accent-fg, not text-canvas-pure: --accent flips lightness between
      // themes, which is the whole reason the -fg pair exists.
      className={cn(
        "text-body-md inline-flex h-8 items-center justify-center rounded-md border border-transparent bg-accent px-3 font-medium text-accent-fg transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      // Mirrors Button's `secondary` variant — see AlertDialogAction above.
      className={cn(
        "text-body-md inline-flex h-8 items-center justify-center rounded-md border border-hairline bg-canvas-pure px-3 font-medium text-ink-main transition-colors hover:bg-canvas-soft",
        className,
      )}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
