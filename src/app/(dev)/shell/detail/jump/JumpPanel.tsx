"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { CompactHeader, MetaStrip } from "@/app/(dev)/shell/detail/preview/PanelChrome";
import {
  ActivityBlock,
  BriefBlock,
  EnquiriesBlock,
  NotesBlock,
} from "@/app/(dev)/shell/detail/preview/SectionBlocks";
import { TasksBlock } from "@/app/(dev)/shell/detail/preview/TasksBlock";
import { QUIET_SCROLLBAR } from "@/app/(dev)/shell/detail/preview/scrollbar";
import { SECTIONS, type SectionId } from "@/app/(dev)/shell/detail/preview/sections";

// VARIANT A — RAIL. One scroll, but you can leap.
//
// The panel stays a single continuous document, exactly as it is today; what
// is added is a sticky strip of jump buttons under the header and a scroll-spy
// that keeps the current one marked. Nothing is hidden, so the answer to
// "what else is on this lead" stays "scroll and you will see it" — that is
// this variant's whole bet, and its cost is the ~36px the strip never gives
// back.
//
// aria-current="true", not aria-pressed: these are navigation targets, not
// toggles. Buttons rather than <a href="#id"> because a hash navigation in a
// panel that will be a portal in production would push a history entry and
// change the page URL for a scroll inside an overlay.
//
// NO outline-none ANYWHERE IN THIS FILE. These are interactive rows, and
// CLAUDE.md is explicit that copying shadcn's outline-none onto one silently
// deletes the global :focus-visible floor. Button carries no such class, so
// keyboard focus on the rail is the app's normal 2px ring.

export function JumpPanel() {
  const [active, setActive] = useState<SectionId>("brief");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<SectionId, HTMLElement>());

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // rootMargin's bottom is pulled up hard so a section counts as "current"
    // only while it is near the TOP of the scroller. Without it the last
    // section can never win — it is often too short to fill the viewport, so
    // the section above it stays more visible and the rail marks the wrong one
    // the whole way down.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as SectionId);
      },
      { root: scroller, rootMargin: "0px 0px -65% 0px", threshold: 0 },
    );

    sectionRefs.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function jumpTo(id: SectionId) {
    // prefers-reduced-motion is honoured here, not in CSS: a smooth scroll is
    // motion the user did not ask for, and `scroll-behavior: smooth` in a
    // stylesheet would not cover a scrollIntoView call made in JS. Matching
    // the query at call time also means a user who changes the setting does
    // not have to reload.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    sectionRefs.current.get(id)?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
    setActive(id);
  }

  return (
    <>
      <CompactHeader />
      <MetaStrip />

      <nav
        aria-label="Jump to section"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-hairline px-3 py-1.5"
      >
        {SECTIONS.map((section) => (
          <Button
            key={section.id}
            type="button"
            size="sm"
            variant={active === section.id ? "secondary" : "ghost"}
            aria-current={active === section.id ? "true" : undefined}
            onClick={() => jumpTo(section.id)}
            className="shrink-0"
          >
            {section.label}
          </Button>
        ))}
      </nav>

      <div ref={scrollerRef} className={cn("flex-1 overflow-y-auto", QUIET_SCROLLBAR)}>
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            // FULL-BLEED RULE BETWEEN SECTIONS, not a gap. plancrm-drawer.webp
            // separates its three blocks with edge-to-edge lines, and the first
            // draft of this comp dropped them for a `space-y-6` gap — which is
            // why the panel read as one unbroken column of text. Whitespace
            // alone cannot say "this is a different kind of record" in a
            // monochrome system; a hairline can, and hairlines are what this
            // design system says structure is made of.
            //
            // The padding therefore moves off the scroller and onto each
            // section, so the border reaches both edges instead of stopping
            // 16px short.
            //
            // scroll-mt is not optional: the scroller's own top is under the
            // sticky rail, so without it scrollIntoView parks each heading
            // beneath the strip that was used to reach it.
            className={cn(
              "scroll-mt-4 border-b border-hairline px-4 py-4 last:border-b-0",
            )}
            ref={(node) => {
              if (node) sectionRefs.current.set(section.id, node);
              else sectionRefs.current.delete(section.id);
            }}
          >
            {section.id === "brief" && <BriefBlock />}
            {section.id === "tasks" && <TasksBlock />}
            {section.id === "enquiries" && <EnquiriesBlock />}
            {section.id === "activity" && <ActivityBlock />}
            {section.id === "notes" && <NotesBlock />}
          </section>
        ))}
      </div>
    </>
  );
}
