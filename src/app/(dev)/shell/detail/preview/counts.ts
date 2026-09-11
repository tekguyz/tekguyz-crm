import { MOCK_ACTIVITY, MOCK_SUBMISSIONS, MOCK_TASKS } from "@/app/(dev)/shell/detail/preview/mock-lead";
import type { SectionId } from "@/app/(dev)/shell/detail/preview/sections";

// The section counts, shared by the two variants that print them: C (the
// accordion, which introduced them) and A (the jump strip, which borrowed them
// when it was picked on 2026-09-09). One copy, so the two cannot disagree about
// how many tasks this lead has.
//
// Plain module, no directive, for the same reason as sections.ts and
// mock-lead.ts: a "use client" file's plain constants arrive as nothing in a
// Server Component. Neither panel imports the other.
//
// Brief and Notes are absent on purpose. There is nothing in them to count,
// and a number invented for them would be worse than no number.
export const COUNTS: Partial<Record<SectionId, number>> = {
  tasks: MOCK_TASKS.filter((task) => !task.completed).length,
  enquiries: MOCK_SUBMISSIONS.length,
  activity: MOCK_ACTIVITY.length,
};

// The noun the count is counting. It exists because the number alone is not a
// sentence: "Tasks 3" tells a sighted operator plenty next to two other
// controls carrying numbers, and tells a screen-reader user almost nothing.
//
// Caught by a test, not by looking: with the label and the count in adjacent
// spans and no whitespace text node between them, the accordion header's
// accessible name computed as the single word "Tasks3". Nothing about that is
// visible on the page — the gap is CSS — so a screenshot pass would never have
// found it.
const COUNT_NOUN: Partial<Record<SectionId, string>> = {
  tasks: "open",
  enquiries: "recorded",
  activity: "entries",
};

// The accessible name for a control that shows a section label and, maybe, its
// count: "Tasks, 3 open" or plain "Brief". Every counted control must set this
// as an explicit aria-label rather than trusting the gap between two spans.
export function countedLabel(id: SectionId, label: string): string {
  const count = COUNTS[id];
  return typeof count === "number" ? `${label}, ${count} ${COUNT_NOUN[id] ?? ""}`.trim() : label;
}
