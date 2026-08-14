"use client";

import { createContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconX } from "@tabler/icons-react";

// Exposes this Modal's own <dialog> DOM node so nested Radix-portal-based
// components (e.g. AlertDialog) can portal into it instead of document.body.
// Native <dialog> shown via showModal() is promoted to the browser's "top
// layer" — content portaled to document.body always renders BEHIND an open
// native dialog regardless of z-index, since the top layer sits above the
// entire normal stacking context. Portaling into the dialog itself keeps
// nested overlays in the same top-layer context, where normal DOM-order/
// z-index stacking applies again. Falls back to document.body (Radix's
// default) for AlertDialogs used outside a Modal.
export const ModalPortalContext = createContext<HTMLDialogElement | null>(null);

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLDialogElement | null>(null);

  useEffect(() => {
    setPortalTarget(dialogRef.current);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-lg border border-hairline bg-canvas-pure p-4 text-ink-main shadow-elevation-2 backdrop:bg-ink-main/40"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-h2">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
        >
          <IconX className="size-4" />
        </button>
      </div>
      <ModalPortalContext.Provider value={portalTarget}>{children}</ModalPortalContext.Provider>
    </dialog>
  );
}
