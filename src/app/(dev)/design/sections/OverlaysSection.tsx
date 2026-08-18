"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/Skeleton";

// THE POPOVER DOES NOT FOLLOW ITS PANE'S THEME — THAT IS EXPECTED. THE MODAL DOES.
//
// Radix's Portal physically MOVES its content to document.body, so an open
// Popover leaves the .light / .dark wrapper ThemePane puts around this section
// and inherits the AMBIENT theme. Open the popover from the light pane while
// the app is in dark mode and you get a DARK popover. Correct, not a bug —
// verify it by toggling the real app theme, not by comparing the two panes.
//
// The native <dialog> behaves the OPPOSITE way, despite both being called
// "portals" loosely. showModal() promotes the element to the browser's top
// layer, which changes only where it PAINTS — the element never moves in the
// DOM, so it still inherits custom properties from this pane. Measured on
// 2026-08-14: the light pane's dialog resolves background lab(100 0 0) and the
// dark pane's resolves lab(5.26 -0.15 -1.17), with the ambient theme dark. So
// the two modals here really are one light and one dark, and comparing panes IS
// the right check for the Modal.
//
// (The Task 11 plan asserted both escape to ambient. They do not; this note
// records what the DOM actually does.)
//
// Everything else in this section is inline and follows its pane normally.
export function OverlaysSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Overlays &amp; composed primitives</h3>

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink-muted">Skeleton</span>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink-muted">
          CopyButton — ghost Button, flips to &quot;Copied&quot; for 1.5s
        </span>
        <div className="flex items-center gap-2">
          <code className="text-body-sm flex-1 truncate rounded-xs border border-hairline bg-canvas-soft px-2 py-1">
            https://example.com/api/v1/triage/00000000-0000-4000-8000-000000000000
          </code>
          <CopyButton text="https://example.com/api/v1/triage/00000000-0000-4000-8000-000000000000" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink-muted">
          PasswordInput — composed on Input
        </span>
        <PasswordInput name="design-password" placeholder="Password" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink-muted">
          Modal (Level 2) and Popover (Level 1) — both render in the ambient theme
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="text-body-md">
                Level 1 elevation — dropdowns and popovers only. This shadow must
                read as visibly lighter than the modal&apos;s.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal title">
        <p className="text-body-md text-ink-muted">
          Level 2 elevation — modals and the command palette only. Closes on
          backdrop click and on Escape.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setModalOpen(false)}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
