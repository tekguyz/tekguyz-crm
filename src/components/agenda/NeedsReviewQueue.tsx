"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { dismissSpamFlag } from "@/lib/leads/spam-actions";
import type { FlaggedLead } from "@/lib/leads/spam-review";

// Sits at the very top of Today's Agenda — above Tasks Due — because an
// unreviewed lead is the most time-sensitive thing on the page: it's a
// potential customer the shield guessed was spam, and a wrong guess costs a
// sale. Renders nothing at all when the queue is empty, so it never adds
// permanent chrome to a clean agenda.
//
// Deliberately reuses the existing ?leadId= deep link and the decorative
// orange status pill rather than inventing a new page or nav concept.
export function NeedsReviewQueue({ leads }: { leads: FlaggedLead[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const visible = leads.filter((lead) => !dismissed.includes(lead.id));
  if (visible.length === 0) return null;

  function handleDismiss(lead: FlaggedLead) {
    startTransition(async () => {
      try {
        await dismissSpamFlag(lead.id);
        setDismissed((prev) => [...prev, lead.id]);
        toast.success(`${lead.client_name} kept as a genuine lead.`);
      } catch {
        toast.error(`Couldn't dismiss the flag on ${lead.client_name} — please try again.`);
      }
    });
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        Needs Review
        <span className="rounded-full bg-pill-orange-bg px-2 py-0.5 text-xs font-medium text-pill-orange-fg">
          {visible.length}
        </span>
      </h2>
      <p className="text-xs text-ink-muted">
        Flagged as possible spam by the AI Spam Shield. They are still real leads in your
        pipeline — nothing has been deleted or hidden.
      </p>

      <ul className="flex flex-col gap-2">
        {visible.map((lead) => (
          <li
            key={lead.id}
            className="flex items-start justify-between gap-3 rounded-md border border-hairline bg-canvas-pure p-3 shadow-elevation-1"
          >
            <div className="min-w-0">
              <Link
                href={`/?leadId=${lead.id}`}
                className="truncate text-sm font-medium text-ink-main hover:text-accent hover:underline"
              >
                {lead.client_name}
              </Link>
              <p className="truncate text-xs text-ink-muted">
                {[lead.company, lead.email].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-pill-orange-fg">{lead.reason}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(lead)}
              disabled={isPending}
              className="shrink-0 rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main transition-colors hover:bg-canvas-soft disabled:opacity-60"
            >
              Not spam
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
