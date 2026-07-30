"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { HELP_TOPICS, type HelpTopic } from "@/lib/help/content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HelpDrawer({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Rendered through DialogTrigger rather than left outside the Dialog root:
  // Radix only restores focus to the trigger on close when it owns that
  // relationship. Verified — with a plain external button, closing dropped
  // focus to <body> instead of returning it to the trigger.
  trigger: ReactNode;
}) {
  const [query, setQuery] = useState("");

  // Reset the search every time it opens — a stale filter from last time is
  // never what you want when you reach for help again.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Same Fuse config shape the command palette uses (weighted keys, 0.35
  // threshold) — deliberately not retuned, so search feels identical in both.
  const fuse = useMemo(
    () =>
      new Fuse(HELP_TOPICS, {
        keys: [
          { name: "title", weight: 2 },
          { name: "keywords", weight: 1.5 },
        ],
        threshold: 0.35,
      }),
    [],
  );

  const results: HelpTopic[] = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : HELP_TOPICS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-hairline px-6 pt-6 pb-4">
          <DialogTitle>Help</DialogTitle>
          <DialogDescription>
            Quick answers for the parts of the app that need one.
          </DialogDescription>
          <div className="mt-3 flex items-center gap-2 rounded-xs border border-hairline bg-canvas-pure p-1.5">
            <Search className="size-4 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help…"
              className="w-full bg-transparent text-sm text-ink-main outline-none placeholder:text-ink-muted"
            />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-4">
          {results.length === 0 ? (
            <p className="text-sm text-ink-muted">No help topics match your search.</p>
          ) : (
            results.map((topic) => (
              <article key={topic.id}>
                <h3 className="mb-1 text-sm font-semibold text-ink-main">{topic.title}</h3>
                <p className="text-sm whitespace-pre-line text-ink-muted">{topic.body}</p>
              </article>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
