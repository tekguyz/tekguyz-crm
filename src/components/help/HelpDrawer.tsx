"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { IconSearch } from "@tabler/icons-react";
import { HELP_TOPICS, type HelpTopic } from "@/lib/help/content";
import { useHelp } from "@/components/help/HelpContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";

// Mounted exactly once, in AppShell, and driven entirely by HelpContext —
// the Header's "?" and every inline HelpTooltip's "Learn more" all open this
// same instance.
export function HelpDrawer() {
  const { isOpen, topicId, closeHelp, openerRef } = useHelp();
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset the search every time it opens — a stale filter from last time is
  // never what you want when you reach for help again.
  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  // Scroll the requested topic into view once the content has mounted. An
  // unknown topicId simply finds nothing and leaves the drawer at the top,
  // which is the intended fallback rather than an error.
  useEffect(() => {
    if (!isOpen || !topicId) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const target = container?.querySelector<HTMLElement>(`[data-topic-id="${topicId}"]`);
      if (container && target) container.scrollTop = target.offsetTop - container.offsetTop;
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, topicId]);

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
    <Dialog open={isOpen} onOpenChange={(next) => !next && closeHelp()}>
      <DialogContent
        className="max-w-lg gap-0 p-0"
        // Every opener lives outside this Dialog root, so Radix has no
        // Trigger to hand focus back to and would drop it on <body>.
        onCloseAutoFocus={(e) => {
          const opener = openerRef.current;
          if (opener?.isConnected) {
            e.preventDefault();
            opener.focus();
          }
        }}
      >
        <DialogHeader className="border-b border-hairline px-6 pt-6 pb-4">
          <DialogTitle>Help</DialogTitle>
          <DialogDescription>
            Quick answers for the parts of the app that need one.
          </DialogDescription>
          {/* The icon is layered over a real Input rather than sitting beside a
              bare one in a hand-drawn box: same relative-wrapper + absolute
              Tabler icon recipe the Select primitive uses for its chevron. The
              field then gets v2's Level 0 border and shared accent focus ring
              from the primitive instead of a local copy of them. */}
          <div className="relative mt-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help…"
              className="pl-8"
            />
            <IconSearch
              aria-hidden="true"
              stroke={1.75}
              className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-ink-muted"
            />
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-4">
          {results.length === 0 ? (
            <p className="text-body-md text-ink-muted">No help topics match your search.</p>
          ) : (
            results.map((topic) => (
              <article key={topic.id} data-topic-id={topic.id}>
                <h3 className="text-title mb-1 text-ink-main">{topic.title}</h3>
                <p className="text-body-md whitespace-pre-line text-ink-muted">{topic.body}</p>
              </article>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
