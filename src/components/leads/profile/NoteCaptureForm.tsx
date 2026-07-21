"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addManualNote } from "@/lib/activity/actions";

// Isolated note-capture module — text-only for now. Prompt 13 layers browser
// audio recording and an optimistic "Transcribing…" state on top of this same
// module; it doesn't exist yet, so this only ever writes MANUAL_NOTE entries.
export function NoteCaptureForm({
  leadId,
  onNoteAdded,
}: {
  leadId: string;
  onNoteAdded: () => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await addManualNote(leadId, content);
        setContent("");
        onNoteAdded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add note.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-hairline pt-3">
      {error && <p className="text-xs text-cold">{error}</p>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note…"
        rows={3}
        className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
      />
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="self-end rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
