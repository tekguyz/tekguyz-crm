"use client";

import { useState, useTransition, type FormEvent } from "react";
import { IconMicrophone, IconSquare } from "@tabler/icons-react";
import { addManualNote, addAudioTranscript } from "@/lib/activity/actions";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

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
      {/* All three states move off --cold onto --danger: --cold is the Going
          Cold SLA signal, not a generic error colour. */}
      {error && <p className="text-body-sm text-danger">{error}</p>}
      {recorderStatus === "denied" && (
        <p className="text-body-sm text-danger">
          Microphone access is blocked. Enable it in your browser settings to record a voice note.
        </p>
      )}
      {recorderStatus === "error" && (
        <p className="text-body-sm text-danger">Couldn&apos;t start recording. Please try again.</p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          rows={3}
        />
        {/* Recording is a live, stoppable state, so it takes the danger
            variant — the previous --cold fill borrowed the SLA signal. */}
        <Button
          type="button"
          variant={recorderStatus === "recording" ? "danger" : "secondary"}
          onClick={handleMicClick}
          disabled={micBusy}
          aria-label={recorderStatus === "recording" ? "Stop recording" : "Record a voice note"}
          className="size-8 shrink-0 px-0"
        >
          {recorderStatus === "recording" ? (
            <IconSquare stroke={1.75} className="size-4" />
          ) : (
            <IconMicrophone stroke={1.75} className="size-4" />
          )}
        </Button>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending || !content.trim()}
        className="self-end"
      >
        {isPending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}
