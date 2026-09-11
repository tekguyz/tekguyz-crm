"use client";

import { cn } from "@/lib/utils/cn";
import { useState } from "react";

import { CompactHeader, MetaStrip } from "@/app/(dev)/shell/detail/preview/PanelChrome";
import {
  ActivityBlock,
  BriefBlock,
  EnquiriesBlock,
  NotesBlock,
} from "@/app/(dev)/shell/detail/preview/SectionBlocks";
import { SectionTabs } from "@/app/(dev)/shell/detail/preview/SectionTabs";
import { TasksBlock } from "@/app/(dev)/shell/detail/preview/TasksBlock";
import { QUIET_SCROLLBAR } from "@/app/(dev)/shell/detail/preview/scrollbar";
import { SECTIONS, type SectionId } from "@/app/(dev)/shell/detail/preview/sections";

// VARIANT D — SPLIT. A wider panel: the brief never leaves the screen, and the
// working sections tab beside it.
//
// This is plancrm-nav-header.webp's actual layout — a standing summary column
// on the left, tabbed detail on the right — rather than only its tab strip.
// The bet is that the brief is not a "section" at all: it is the thing you
// re-read while doing everything else, and every one of the other three
// variants makes you leave it to do anything.
//
// Its cost is width. At max-w-3xl this stops being a slide-over and starts
// being most of the screen, which weakens the reason a slide-over exists —
// you were meant to keep your place in the pipeline board behind it. It also
// has nowhere to go on a phone: below `md` it collapses back to Variant B
// exactly, so on the surface where the scroll problem bites hardest this
// variant contributes nothing of its own.
//
// Brief is therefore NOT in the tab list here — it is the left column, and so
// is the note composer, for the same reason: you write a note ABOUT what you
// are reading in the tabs, so making it a tab means leaving the thing you are
// writing about. Three sections tab. On a phone the columns stack, so both
// stay reachable by scrolling and neither is rendered twice.
const TABBED = SECTIONS.filter(
  (section) => section.id !== "brief" && section.id !== "notes",
);

export function SplitPanel() {
  const [active, setActive] = useState<SectionId>("tasks");

  return (
    <>
      <CompactHeader />
      <MetaStrip />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* The standing column. Its own scroller, so a long brief cannot push
            the tabbed side out of view — two independent scrollers is the
            whole point of splitting. */}
        <div className={cn("shrink-0 overflow-y-auto border-b border-hairline p-4 md:w-[19rem] md:border-r md:border-b-0", QUIET_SCROLLBAR)}>
          <BriefBlock />
          <div className="mt-4 border-t border-hairline pt-4">
            <NotesBlock />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <SectionTabs
            sections={TABBED}
            active={active}
            onChange={setActive}
            label="Lead sections"
          />
          <div
            role="tabpanel"
            id={`panel-${active}`}
            aria-labelledby={`tab-${active}`}
            tabIndex={0}
            className={cn("flex-1 overflow-y-auto p-4", QUIET_SCROLLBAR)}
          >
            {active === "tasks" && <TasksBlock />}
            {active === "enquiries" && <EnquiriesBlock />}
            {active === "activity" && <ActivityBlock />}
          </div>
        </div>
      </div>
    </>
  );
}
