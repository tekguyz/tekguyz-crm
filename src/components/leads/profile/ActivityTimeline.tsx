"use client";

import { useEffect, useState } from "react";
import { fetchActivityLogs } from "@/lib/activity/actions";
import type { ActivityLog } from "@/lib/activity/queries";

const LOG_TYPE_LABEL: Record<ActivityLog["log_type"], string> = {
  WEBHOOK: "Inbound Webhook",
  MANUAL_NOTE: "Note",
  AUDIO_TRANSCRIPT: "Voice Note",
  SYSTEM_ALERT: "System",
};

export type PendingVoiceNote = { status: "transcribing" } | { status: "error"; message: string };

// Immutable timeline viewer — read-only by design. There is no edit/delete
// path anywhere in this component or the server actions it calls, matching
// the activity_logs table having no UPDATE/DELETE policy at all.
//
// pendingEntry is the one exception to "just renders what the server has":
// it's local optimistic state for an in-flight voice-note transcription,
// owned by ProfileSheet (the parent both this and NoteCaptureForm sit under)
// since the recording flow itself lives in the sibling NoteCaptureForm.
export function ActivityTimeline({
  leadId,
  refreshKey,
  pendingEntry,
  onDismissPending,
}: {
  leadId: string;
  refreshKey: number;
  pendingEntry?: PendingVoiceNote | null;
  onDismissPending?: () => void;
}) {
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLogs(null);
    setError(null);

    fetchActivityLogs(leadId)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load activity.");
      });

    return () => {
      cancelled = true;
    };
  }, [leadId, refreshKey]);

  const hasEntries = (logs && logs.length > 0) || Boolean(pendingEntry);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Activity</h3>

      {error && <p className="text-sm text-cold">{error}</p>}
      {!error && logs === null && <p className="text-sm text-ink-muted">Loading…</p>}
      {!error && logs !== null && !hasEntries && (
        <p className="text-sm text-ink-muted">No activity yet.</p>
      )}

      {!error && logs !== null && hasEntries && (
        <ul className="flex flex-col gap-3 border-l border-hairline pl-4">
          {pendingEntry && (
            <li className="relative">
              <span className="absolute top-1.5 -left-[18.5px] size-2 animate-pulse rounded-full border border-canvas-pure bg-accent" />
              {pendingEntry.status === "transcribing" ? (
                <p className="text-sm text-ink-muted">🎙️ Transcribing…</p>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-cold">{pendingEntry.message}</p>
                  <button
                    type="button"
                    onClick={onDismissPending}
                    className="shrink-0 text-xs text-ink-muted underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          )}

          {logs?.map((log) => (
            <li key={log.id} className="relative">
              <span className="absolute top-1.5 -left-[18.5px] size-2 rounded-full border border-canvas-pure bg-hairline" />
              <p className="text-xs text-ink-muted">
                {LOG_TYPE_LABEL[log.log_type]} · {new Date(log.created_at).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink-main">{log.content}</p>
              {log.audio_url && (
                <audio controls src={log.audio_url} className="mt-1 h-8 w-full" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
