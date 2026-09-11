"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { cn } from "@/lib/utils/cn";
import { CompactHeader, MetaStrip } from "@/app/(dev)/shell/detail/preview/PanelChrome";
import {
  ActivityBlock,
  BriefBlock,
  EnquiriesBlock,
  NotesBlock,
} from "@/app/(dev)/shell/detail/preview/SectionBlocks";
import { TasksBlock } from "@/app/(dev)/shell/detail/preview/TasksBlock";
import { MOCK_ACTIVITY, MOCK_SUBMISSIONS, MOCK_TASKS } from "@/app/(dev)/shell/detail/preview/mock-lead";
import { QUIET_SCROLLBAR } from "@/app/(dev)/shell/detail/preview/scrollbar";
import { SECTIONS, type SectionId } from "@/app/(dev)/shell/detail/preview/sections";

// VARIANT C — ACCORDION. The whole index fits on one screen, unscrolled.
//
// Neither of the other two answers lets you SEE the shape of a lead at a
// glance: the rail still needs a scroll to prove what is down there, and the
// tabs show you four labels and hide four bodies. Here every section is a
// collapsed row with a count beside it, so "3 open tasks, 2 enquiries, 3
// activity entries" is readable before a single click — and any number of
// sections can be opened together, which is the thing tabs cannot do.
//
// Its cost is real and is the reverse: reading two sections is two clicks, and
// a panel that opens showing no content at all is a colder start than either
// alternative. Brief is therefore open on arrival — the one section that is
// prose rather than a list, and the one an operator reads first.
//
// Counts, not badges with colour: a number in ink-muted says the same thing
// and spends nothing from the pill palette, which is reserved for status.
//
// Native disclosure semantics by hand (button + aria-expanded + aria-controls)
// rather than <details>/<summary>, because a <summary> cannot carry the
// count on the opposite side of the row without fighting its own marker box.
// No outline-none: each header IS an interactive row and keeps the ring.

const COUNTS: Partial<Record<SectionId, number>> = {
  tasks: MOCK_TASKS.filter((task) => !task.completed).length,
  enquiries: MOCK_SUBMISSIONS.length,
  activity: MOCK_ACTIVITY.length,
};

// The noun the count is counting. It exists because the number alone is not a
// sentence: "Tasks 3" tells a sighted operator plenty next to two other rows
// carrying numbers, and tells a screen-reader user almost nothing.
//
// Caught by a test, not by looking: with the label and the count in adjacent
// spans and no whitespace text node between them, the button's accessible name
// computed as the single word "Tasks3". Nothing about that is visible on the
// page — the gap is CSS — so a screenshot pass would never have found it.
const COUNT_NOUN: Partial<Record<SectionId, string>> = {
  tasks: "open",
  enquiries: "recorded",
  activity: "entries",
};

export function AccordionPanel() {
  const [open, setOpen] = useState<SectionId[]>(["brief"]);

  function toggle(id: SectionId) {
    setOpen((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <>
      <CompactHeader />
      <MetaStrip />

      <div className={cn("flex-1 overflow-y-auto", QUIET_SCROLLBAR)}>
        {SECTIONS.map((section) => {
          const expanded = open.includes(section.id);
          const count = COUNTS[section.id];

          return (
            <div key={section.id} className="border-b border-hairline">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`section-${section.id}`}
                // Explicit, so the spoken name is "Tasks, 3 open" rather than
                // the concatenation of two adjacent spans. The visible text is
                // unchanged.
                aria-label={
                  typeof count === "number"
                    ? `${section.label}, ${count} ${COUNT_NOUN[section.id] ?? ""}`.trim()
                    : section.label
                }
                onClick={() => toggle(section.id)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-canvas-soft"
              >
                <IconChevronDown
                  stroke={1.75}
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 text-ink-muted transition-transform",
                    expanded ? "rotate-0" : "-rotate-90",
                  )}
                />
                <span className="text-title flex-1">{section.label}</span>
                {typeof count === "number" ? (
                  <span className="text-body-sm tabular-nums text-ink-muted">{count}</span>
                ) : null}
              </button>

              {expanded ? (
                <div id={`section-${section.id}`} className="px-4 pt-1 pb-4">
                  {/* showHeading={false} because the disclosure header above
                      already names the section — the same words twice, one
                      line apart, is the sloppiest thing an accordion can do.
                      The blocks are otherwise the shared ones every variant
                      renders, which is what keeps the four honestly
                      comparable. */}
                  {section.id === "brief" && <BriefBlock showHeading={false} />}
                  {section.id === "tasks" && <TasksBlock showHeading={false} />}
                  {section.id === "enquiries" && <EnquiriesBlock showHeading={false} />}
                  {section.id === "activity" && <ActivityBlock showHeading={false} />}
                  {section.id === "notes" && <NotesBlock showHeading={false} />}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
