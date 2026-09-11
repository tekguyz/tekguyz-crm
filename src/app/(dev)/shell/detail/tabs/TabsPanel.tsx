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

// VARIANT B — TABS. One section at a time; the long scroll stops existing.
//
// The tabbed right-rail from plancrm-nav-header.webp's TAKE line, brought into
// the panel. Its IGNORE line is respected: the tabs are our five real sections,
// not the reference's loan tabs (Position, Docs Owed), which would be inventing
// a data model we do not have.
//
// The tab list itself is SectionTabs, shared with Variant D — see that file for
// why it is a comp-local module and not a new ui/ primitive.

export function TabsPanel() {
  const [active, setActive] = useState<SectionId>("brief");

  return (
    <>
      <CompactHeader />
      <MetaStrip />

      <SectionTabs
        sections={SECTIONS}
        active={active}
        onChange={setActive}
        label="Lead sections"
      />

      {/* Only the selected panel is rendered. The others are unmounted, not
          hidden — which is the honest version of this variant's cost: Tasks
          loses its Open/Completed choice every time you leave and come back,
          and in a wired build each return would re-fetch. */}
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        className={cn("flex-1 overflow-y-auto p-4", QUIET_SCROLLBAR)}
      >
        {active === "brief" && <BriefBlock />}
        {active === "tasks" && <TasksBlock />}
        {active === "enquiries" && <EnquiriesBlock />}
        {active === "activity" && <ActivityBlock />}
        {active === "notes" && <NotesBlock />}
      </div>
    </>
  );
}
