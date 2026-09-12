"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Lead } from "@/lib/leads/queries";
import { fetchOrgDisplaySettings } from "@/lib/organizations/actions";
import { Button } from "@/components/ui/Button";
import { ExecutiveBrief } from "@/components/leads/profile/ExecutiveBrief";
import { ActivityTimeline, type PendingVoiceNote } from "@/components/leads/profile/ActivityTimeline";
import { EnquiryHistory } from "@/components/leads/profile/EnquiryHistory";
import { LeadMetaStrip } from "@/components/leads/profile/LeadMetaStrip";
import { LeadPanelHeader } from "@/components/leads/profile/LeadPanelHeader";
import { NoteCaptureForm } from "@/components/leads/profile/NoteCaptureForm";
import { TasksSection } from "@/components/leads/profile/TasksSection";
import {
  SECTIONS,
  countedLabel,
  type SectionCounts,
  type SectionId,
} from "@/components/leads/profile/panel-sections";

// THE PICKED READ VIEW, WIRED - Variant A, the jump strip (picked 2026-09-09,
// closed out with section counts 2026-09-11).
//
// The panel stays one continuous document, exactly as the shipped sheet was;
// what is added is a sticky strip of jump buttons under the metadata row and a
// scroll-spy that keeps the current one marked. Nothing is hidden, so the
// answer to "what else is on this lead" stays "scroll and you will see it".
//
// COUNTS ARE REAL HERE, not a fixture. Each of the three list sections reports
// what it actually loaded through its own count callback, so the strip cannot
// claim a number the section below it does not have. A section that has not
// loaded yet reports nothing and its button shows no number, rather than
// showing a zero that would be a lie for the first few hundred milliseconds.
//
// aria-current="true", not aria-pressed: these are navigation targets, not
// toggles. Buttons rather than <a href="#id"> because a hash navigation inside
// an overlay would push a history entry and change the page URL for a scroll.
//
// NO outline-none ANYWHERE IN THIS FILE. These are interactive rows, and
// CLAUDE.md is explicit that copying shadcn's outline-none onto one silently
// deletes the global :focus-visible floor.
//
// This is a separate component from ProfileSheet rather than its body for a
// mechanical reason: Radix mounts a Sheet's content only while it is open, so
// keeping the effects here means the scroll-spy observer and the settings
// fetch run on open and are torn down on close, instead of running once for
// the life of a panel that is shut.
export function LeadProfilePanel({
  lead,
  onClose,
  highlightTaskId,
}: {
  lead: Lead;
  onClose: () => void;
  highlightTaskId: string | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingVoiceNote, setPendingVoiceNote] = useState<PendingVoiceNote | null>(null);
  const [counts, setCounts] = useState<SectionCounts>({});
  const [display, setDisplay] = useState({ timeZone: "UTC", currencyFormat: "USD" });

  const [active, setActive] = useState<SectionId>("brief");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<SectionId, HTMLElement>());

  useEffect(() => {
    let cancelled = false;
    // A failure here is not worth an error state: the strip still renders with
    // the UTC/USD defaults, which is a formatting difference and not a missing
    // fact. The panel's real data sections each report their own errors.
    fetchOrgDisplaySettings()
      .then((settings) => {
        if (!cancelled) setDisplay(settings);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // rootMargin's bottom is pulled up hard so a section counts as "current"
    // only while it is near the TOP of the scroller. Without it the last
    // section can never win - it is often too short to fill the viewport, so
    // the section above it stays more visible and the strip marks the wrong
    // one the whole way down.
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

  // One memoised callback per counted section. An inline arrow would be a new
  // function on every render, so each section's reporting effect would re-run
  // on every parent render and set state again - a render loop, not a
  // cosmetic waste.
  const reportTasks = useCallback((n: number) => setCounts((c) => ({ ...c, tasks: n })), []);
  const reportEnquiries = useCallback(
    (n: number) => setCounts((c) => ({ ...c, enquiries: n })),
    [],
  );
  const reportActivity = useCallback((n: number) => setCounts((c) => ({ ...c, activity: n })), []);

  const registerSection = (id: SectionId) => (node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node);
    else sectionRefs.current.delete(id);
  };

  return (
    <>
      <LeadPanelHeader lead={lead} onClose={onClose} />
      <LeadMetaStrip
        lead={lead}
        timeZone={display.timeZone}
        currencyFormat={display.currencyFormat}
      />

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
            aria-label={countedLabel(section.id, section.label, counts[section.id])}
            onClick={() => jumpTo(section.id)}
            className="shrink-0"
          >
            {section.label}
            {typeof counts[section.id] === "number" ? (
              <span className="tabular-nums text-ink-muted">{counts[section.id]}</span>
            ) : null}
          </Button>
        ))}
      </nav>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            ref={registerSection(section.id)}
            // FULL-BLEED RULE BETWEEN SECTIONS, not a gap. The reference this
            // panel follows separates its blocks with edge-to-edge lines, and
            // the first Stage 1 draft dropped them for a `space-y-6` gap -
            // which is what made the panel read as one unbroken column of
            // text. Whitespace alone cannot say "this is a different kind of
            // record" in a monochrome system; a hairline can.
            //
            // The padding therefore lives on each section, not the scroller,
            // so the border reaches both edges instead of stopping short.
            //
            // scroll-mt is not optional: without it scrollIntoView parks each
            // heading under the strip that was used to reach it.
            className="scroll-mt-4 border-b border-hairline px-4 py-4 last:border-b-0"
          >
            {section.id === "brief" && <ExecutiveBrief brief={lead.ai_brief} />}
            {section.id === "tasks" && (
              <TasksSection
                leadId={lead.id}
                highlightTaskId={highlightTaskId}
                onOpenCountChange={reportTasks}
              />
            )}
            {/* Enquiries above Activity deliberately: what the customer sent
                comes before what we did about it, and the two stay separate
                columns rather than one interleaved stream. */}
            {section.id === "enquiries" && (
              <EnquiryHistory leadId={lead.id} onCountChange={reportEnquiries} />
            )}
            {section.id === "activity" && (
              <ActivityTimeline
                leadId={lead.id}
                refreshKey={refreshKey}
                pendingEntry={pendingVoiceNote}
                onDismissPending={() => setPendingVoiceNote(null)}
                onCountChange={reportActivity}
              />
            )}
            {section.id === "notes" && (
              <NoteCaptureForm
                leadId={lead.id}
                onNoteAdded={() => setRefreshKey((k) => k + 1)}
                onRecordingStart={() => setPendingVoiceNote({ status: "transcribing" })}
                onRecordingSettled={(result) =>
                  setPendingVoiceNote(
                    result.ok ? null : { status: "error", message: result.message },
                  )
                }
              />
            )}
          </section>
        ))}
      </div>
    </>
  );
}
