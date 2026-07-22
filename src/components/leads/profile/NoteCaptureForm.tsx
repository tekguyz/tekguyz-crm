"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Mic, Square } from "lucide-react";
import { addManualNote, addAudioTranscript } from "@/lib/activity/actions";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";

export type RecordingSettleResult = { ok: true } | { ok: false; message: string };

// Isolated note-capture module — text input (Prompt 7) plus a one-tap
// recording mode (Prompt 13). Recording feeds an optimistic "Transcribing…"
// state up to ProfileSheet, which is what actually renders it in the
// timeline — ActivityTimeline and this form are siblings, so the pending
// state has to live one level up.
export function NoteCaptureForm({
  leadId,
  onNoteAdded,
  onRecordingStart,
  onRecordingSettled,
}: {
  leadId: string;
  onNoteAdded: () => void;
  onRecordingStart: () => void;
  onRecordingSettled: (result: RecordingSettleResult) => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { status: recorderStatus, start, stop } = useAudioRecorder();

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

  async function handleMicClick() {
    if (recorderStatus === "recording") {
      const blob = await stop();
      if (!blob || blob.size === 0) return;

      onRecordingStart();
      setIsTranscribing(true);
      try {
        await addAudioTranscript(leadId, blob);
        onRecordingSettled({ ok: true });
        onNoteAdded();
      } catch (err) {
        onRecordingSettled({
          ok: false,
          message: err instanceof Error ? err.message : "Failed to transcribe voice note.",
        });
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    setError(null);
    await start();
  }

  const micBusy = isTranscribing || isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-hairline pt-3">
      {error && <p className="text-xs text-cold">{error}</p>}
      {recorderStatus === "denied" && (
        <p className="text-xs text-cold">
          Microphone access is blocked. Enable it in your browser settings to record a voice note.
        </p>
      )}
      {recorderStatus === "error" && (
        <p className="text-xs text-cold">Couldn&apos;t start recording. Please try again.</p>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={micBusy}
          aria-label={recorderStatus === "recording" ? "Stop recording" : "Record a voice note"}
          className={`flex size-9 shrink-0 items-center justify-center rounded-md border border-hairline transition-colors disabled:opacity-60 ${
            recorderStatus === "recording"
              ? "bg-cold text-canvas-pure"
              : "bg-canvas-pure text-ink-muted hover:bg-canvas-soft hover:text-ink-main"
          }`}
        >
          {recorderStatus === "recording" ? <Square className="size-4" /> : <Mic className="size-4" />}
        </button>
      </div>

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
