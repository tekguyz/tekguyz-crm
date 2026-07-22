"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { Lead } from "@/lib/leads/queries";
import { ExecutiveBrief } from "@/components/leads/profile/ExecutiveBrief";
import { ActivityTimeline, type PendingVoiceNote } from "@/components/leads/profile/ActivityTimeline";
import { NoteCaptureForm } from "@/components/leads/profile/NoteCaptureForm";

export function ProfileSheet({
  lead,
  open,
  onClose,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pendingVoiceNote, setPendingVoiceNote] = useState<PendingVoiceNote | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  // Portalled to document.body — this sheet is triggered from inside
  // EditLeadModal's <dialog>, and a closed <dialog> is display:none for its
  // entire subtree regardless of this panel's own position:fixed, so it must
  // render outside that DOM tree to stay visible once the edit modal closes.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink-main/40"
          />
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-hairline bg-canvas-pure shadow-elevation-2 sm:max-w-lg"
          >
            <div className="flex items-center justify-between border-b border-hairline p-6">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{lead.client_name}</p>
                {lead.company && (
                  <p className="truncate text-xs text-ink-muted">{lead.company}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <ExecutiveBrief brief={lead.ai_brief} />
              <ActivityTimeline
                leadId={lead.id}
                refreshKey={refreshKey}
                pendingEntry={pendingVoiceNote}
                onDismissPending={() => setPendingVoiceNote(null)}
              />
            </div>

            <div className="p-6 pt-0">
              <NoteCaptureForm
                leadId={lead.id}
                onNoteAdded={() => setRefreshKey((k) => k + 1)}
                onRecordingStart={() => setPendingVoiceNote({ status: "transcribing" })}
                onRecordingSettled={(result) =>
                  setPendingVoiceNote(
                    result.ok ? null : { status: "error", message: result.message },
                  )
                }
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
