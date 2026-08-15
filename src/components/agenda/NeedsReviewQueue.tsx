"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { dismissSpamFlag } from "@/lib/leads/spam-actions";
import type { FlaggedLead } from "@/lib/leads/spam-review";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
      <h2 className="text-title flex items-center gap-2">
        Needs Review
        {/* Count badge: same orange status pill as before, now the shared
            Badge primitive. It is a queue-depth signal, not decoration. */}
        <Badge tone="orange" className="rounded-full px-2">
          {visible.length}
        </Badge>
      </h2>
      <p className="text-body-sm text-ink-muted">
        Flagged as possible spam by the AI Spam Shield. They are still real leads in your
        pipeline — nothing has been deleted or hidden.
      </p>

      <ul className="flex flex-col gap-2">
        {visible.map((lead) => (
          <li key={lead.id}>
            {/* Level 0: the v1 elevation-1 row is now a flat hairline Card,
                matching every other agenda row. */}
            <Card className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <Link
                  href={`/?leadId=${lead.id}`}
                  className="text-body-md truncate font-medium text-ink-main hover:text-accent hover:underline"
                >
                  {lead.client_name}
                </Link>
                <p className="text-body-sm truncate text-ink-muted">
                  {[lead.company, lead.email].filter(Boolean).join(" · ")}
                </p>
                {/* Verbatim flag reason, kept on the orange status colour so
                    the reason reads as the same signal as the count badge. */}
                <p className="text-body-sm mt-1 text-pill-orange-fg">{lead.reason}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDismiss(lead)}
                disabled={isPending}
                className="shrink-0"
              >
                Not spam
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
