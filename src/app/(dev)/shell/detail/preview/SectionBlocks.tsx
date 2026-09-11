import { IconMicrophone } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  MOCK_ACTIVITY,
  MOCK_LEAD,
  MOCK_SUBMISSIONS,
} from "@/app/(dev)/shell/detail/preview/mock-lead";

// The four stateless section bodies. TasksBlock is the fifth and lives in its
// own file because it is the only one that holds state.
//
// All five are CARRIED OVER FROM THE SHIPPED PANEL, restyled — the prompt is
// explicit that Tasks, the Enquiry History timeline and the notes composer are
// not to be rebuilt. Their markup follows the shipped modules closely enough
// that a real wiring pass in Stage 2 is a swap, not a rewrite.

// `showHeading` exists for the accordion variant only: its own disclosure
// header already names the section, and a second heading directly under it
// reads as a duplicate. A prop rather than a `[&_h3]:sr-only` wrapper because
// sr-only is position:absolute — it would leave TasksBlock's justify-between
// row with a single in-flow child and quietly shunt the Open/Completed pair to
// the left edge. Every other variant leaves the default alone, so the blocks
// stay identical between them.
export type BlockProps = { showHeading?: boolean };

export function BriefBlock({ showHeading = true }: BlockProps) {
  return (
    <div className="flex flex-col gap-2">
      {showHeading ? (
        <h3 className="text-label uppercase text-ink-muted">Executive brief</h3>
      ) : null}
      {/* The shipped ExecutiveBrief runs the text through ReactMarkdown. A comp
          has no markdown to render and pulling the dependency in to prove that
          would tell us nothing about layout, so this is a plain paragraph. */}
      <p className="text-body-md text-ink-main">{MOCK_LEAD.ai_brief}</p>
    </div>
  );
}

/**
 * The colored-chip timeline from plancrm-drawer.webp's TAKE line — with the
 * chips coming from THIS project's decorative pill palette via Badge, never a
 * new colour set. That is the same trap bondcrm-pipeline.png's DO NOT TAKE
 * line warns about: colour as a layout signal. Here the chip carries
 * service_category, a real column, and nothing else in the row is coloured.
 *
 * Hollow markers, matching the shipped EnquiryHistory: this column is
 * visitor-authored and Activity's is staff-authored, and the marker is the
 * cheapest honest way to say so without a second visual language.
 */
export function EnquiriesBlock({ showHeading = true }: BlockProps) {
  return (
    <div className="flex flex-col gap-3">
      {showHeading ? (
        <h3 className="text-label uppercase text-ink-muted">Enquiry history</h3>
      ) : null}
      <ul className="flex flex-col gap-3 border-l border-hairline pl-4">
        {MOCK_SUBMISSIONS.map((submission) => (
          <li key={submission.id} className="relative">
            <span className="absolute top-1.5 -left-[18.5px] size-2 rounded-full border border-ink-muted bg-canvas-pure" />
            <p className="text-caption text-ink-muted">
              {submission.at} · {submission.source}
            </p>
            <p className="text-body-md break-words whitespace-pre-wrap text-ink-main">
              {submission.message}
            </p>
            {submission.category ? (
              <Badge tone="teal" dot className="mt-1">
                {submission.category}
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityBlock({ showHeading = true }: BlockProps) {
  return (
    <div className="flex flex-col gap-3">
      {showHeading ? (
        <h3 className="text-label uppercase text-ink-muted">Activity</h3>
      ) : null}
      <ul className="flex flex-col gap-3 border-l border-hairline pl-4">
        {MOCK_ACTIVITY.map((entry) => (
          <li key={entry.id} className="relative">
            {/* Filled marker against Enquiries' hollow one — the shipped
                ActivityTimeline / EnquiryHistory pair, unchanged. */}
            <span className="absolute top-1.5 -left-[18.5px] size-2 rounded-full bg-ink-muted" />
            <p className="text-caption text-ink-muted">
              {entry.at} · {entry.author}
            </p>
            <p className="text-body-md break-words text-ink-main">{entry.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The notes composer, carried over. The microphone is the shipped voice-note
 * affordance; it does nothing here. `Add note` is the panel's single primary
 * CTA, which is the one place --accent is spent inside the panel body.
 */
export function NotesBlock({ showHeading = true }: BlockProps) {
  return (
    <div className="flex flex-col gap-2">
      {showHeading ? (
        <h3 className="text-label uppercase text-ink-muted">Add a note</h3>
      ) : null}
      <div className="flex items-start gap-2">
        {/* aria-label, not the placeholder, for the same reason the task
            fields carry one: a placeholder is not a label. */}
        <Textarea placeholder="Add a note…" aria-label="Note" rows={3} />
        <Button variant="secondary" size="sm" aria-label="Record a voice note" className="size-7 shrink-0 px-0">
          <IconMicrophone stroke={1.75} aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" size="sm">
          Add note
        </Button>
      </div>
    </div>
  );
}
