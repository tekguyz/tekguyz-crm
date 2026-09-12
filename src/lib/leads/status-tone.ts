import type { BadgeTone } from "@/components/ui/Badge";

// THE ONE STAGE -> PILL MAPPING. A stage has to look the same everywhere it
// appears, or the colour stops being a stage language and becomes decoration,
// which the design system does not allow.
//
// This used to be three hand-kept copies — STATUS_TONE in
// components/agenda/LeadCard.tsx, STAGE_TONE in components/reports/
// StageLedger.tsx, and a third in the Stage 1 detail-panel comp — each
// carrying a comment saying "if one map changes, change both". Three copies
// and a comment is not a mechanism. Stage 2 was named as the time to fix it
// (see the comp's own note in src/app/(dev)/shell/detail/preview/
// PanelChrome.tsx), and the fourth consumer landing here is what made it due.
//
// Plain module, no directive: server and client components both read it.
export const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "sky",
  DISCOVERY: "purple",
  QUOTED: "orange",
  ACTIVE: "green",
};
