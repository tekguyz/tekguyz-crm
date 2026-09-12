// The five sections of the lead read panel, in one shared list.
//
// Carried over from the Stage 1 comp (src/app/(dev)/shell/detail/preview/
// sections.ts) unchanged in order and wording, because the jump strip is the
// picked design and its section list IS the design. What changed in wiring is
// only where the counts come from: the comp counted a static fixture, this
// counts what the three data sections actually loaded.
//
// Plain module, no directive. A "use client" module's plain constants arrive
// as nothing in a Server Component (CLAUDE.md § Build discipline), and the
// panel's own test imports this list directly.
export type SectionId = "brief" | "tasks" | "enquiries" | "activity" | "notes";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "tasks", label: "Tasks" },
  { id: "enquiries", label: "Enquiries" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
];

// Only the three sections that load a list report a number. Brief and Notes
// are absent on purpose: there is nothing in them to count, and a number
// invented for them would be worse than no number.
export type SectionCounts = Partial<Record<SectionId, number>>;

// The noun the count is counting. It exists because the number alone is not a
// sentence: "Tasks 3" tells a sighted operator plenty next to two other
// controls carrying numbers, and tells a screen-reader user almost nothing.
//
// Caught by a test in Stage 1, not by looking: with the label and the count in
// adjacent spans and no whitespace text node between them, a header's
// accessible name computed as the single word "Tasks3". Nothing about that is
// visible on the page — the gap is CSS — so a screenshot pass would never
// have found it. Every counted control must set this as an explicit
// aria-label rather than trusting the gap between two spans.
const COUNT_NOUN: Partial<Record<SectionId, string>> = {
  tasks: "open",
  enquiries: "recorded",
  activity: "entries",
};

export function countedLabel(id: SectionId, label: string, count?: number): string {
  return typeof count === "number" ? `${label}, ${count} ${COUNT_NOUN[id] ?? ""}`.trim() : label;
}
