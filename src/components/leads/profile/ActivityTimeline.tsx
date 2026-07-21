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

// Immutable timeline viewer — read-only by design. There is no edit/delete
// path anywhere in this component or the server actions it calls, matching
// the activity_logs table having no UPDATE/DELETE policy at all.
export function ActivityTimeline({
  leadId,
  refreshKey,
}: {
  leadId: string;
  refreshKey: number;
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

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Activity</h3>

      {error && <p className="text-sm text-cold">{error}</p>}
      {!error && logs === null && <p className="text-sm text-ink-muted">Loading…</p>}
      {!error && logs?.length === 0 && (
        <p className="text-sm text-ink-muted">No activity yet.</p>
      )}

      {logs && logs.length > 0 && (
        <ul className="flex flex-col gap-3 border-l border-hairline pl-4">
          {logs.map((log) => (
            <li key={log.id} className="relative">
              <span className="absolute top-1.5 -left-[18.5px] size-2 rounded-full border border-canvas-pure bg-hairline" />
              <p className="text-xs text-ink-muted">
                {LOG_TYPE_LABEL[log.log_type]} · {new Date(log.created_at).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink-main">{log.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
