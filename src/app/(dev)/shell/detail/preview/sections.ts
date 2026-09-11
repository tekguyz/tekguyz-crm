// The five sections every variant carries, in the shipped panel's order. The
// four variants differ ONLY in how you reach a section — that is the point of
// this prompt — so the list itself has to be one shared constant, or a
// "difference" between two comps could just be a typo in one of them.
//
// Plain module, no directive: the server pages and the client panels both read
// it. See mock-lead.ts for why that matters.
export type SectionId = "brief" | "tasks" | "enquiries" | "activity" | "notes";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "tasks", label: "Tasks" },
  { id: "enquiries", label: "Enquiries" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
];
