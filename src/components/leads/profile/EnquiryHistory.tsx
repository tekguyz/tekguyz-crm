"use client";

import { useEffect, useState } from "react";
import { fetchLeadSubmissions } from "@/lib/submissions/actions";
import type { LeadSubmission } from "@/lib/submissions/queries";
import { Badge } from "@/components/ui/Badge";

// Sibling of ActivityTimeline / TasksSection / NoteCaptureForm — ProfileSheet
// mounts all four directly.
//
// WHY THIS IS NOT MERGED INTO ActivityTimeline
// Submissions are visitor-authored: what someone outside the company actually
// typed into a form, at the moment they typed it. activity_logs is
// staff/system-authored: notes, voice memos, spam verdicts, webhook receipts.
// Interleaving them would erase that distinction, and the immutable-record
// argument this codebase leans on (a submission is evidence of what was said)
// only holds while the two stay visibly separate.
//
// Read-only with no exceptions. lead_submissions grants authenticated SELECT
// and INSERT only, with no UPDATE/DELETE policy at all, so there is no edit or
// delete affordance here and none can be added without first weakening the
// migration.
export function EnquiryHistory({ leadId }: { leadId: string }) {
  const [submissions, setSubmissions] = useState<LeadSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSubmissions(null);
    setError(null);

    fetchLeadSubmissions(leadId)
      .then((data) => {
        if (!cancelled) setSubmissions(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load enquiries.");
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-label uppercase text-ink-muted">Enquiry history</h3>

      {/* --danger, not --cold: --cold is the Going Cold SLA signal and must
          not double as a generic error colour. Same call ActivityTimeline
          makes. */}
      {error && <p className="text-body-md text-danger">{error}</p>}
      {!error && submissions === null && <p className="text-body-md text-ink-muted">Loading…</p>}
      {!error && submissions?.length === 0 && (
        <p className="text-body-md text-ink-muted">No enquiries recorded yet.</p>
      )}

      {!error && submissions && submissions.length > 0 && (
        <ul className="flex flex-col gap-3 border-l border-hairline pl-4">
          {submissions.map((submission) => (
            <li key={submission.id} className="relative">
              {/* Hollow marker, against ActivityTimeline's filled one — the
                  cheapest honest signal that this column is a different kind
                  of record, without inventing a new visual language for it. */}
              <span className="absolute top-1.5 -left-[18.5px] size-2 rounded-full border border-ink-muted bg-canvas-pure" />
              <p className="text-caption text-ink-muted">
                {new Date(submission.created_at).toLocaleString()}
                {submission.lead_source && ` · ${submission.lead_source}`}
              </p>

              {/* break-words for the same reason ActivityTimeline needs it: a
                  pasted URL or unbroken string has nothing to wrap on and
                  pushes a horizontal scrollbar across the whole sheet body. */}
              {submission.message ? (
                <p className="text-body-md whitespace-pre-wrap break-words text-ink-main">
                  {submission.message}
                </p>
              ) : (
                <p className="text-body-md text-ink-muted italic">No message included.</p>
              )}

              {submission.service_category && (
                <Badge tone="neutral" dot className="mt-1">
                  {submission.service_category}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
