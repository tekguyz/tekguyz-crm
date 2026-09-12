// THE ONE WIDTH RAMP BOTH LEAD SURFACES USE.
//
// Reading a lead (ProfileSheet, the picked Jump-strip panel) and editing one
// (EditLeadDrawer, the picked Drawer container) occupy the SAME slot on
// screen — the right-hand edge — and the 2026-09-12 review picked the drawer
// on exactly that basis. If the two ramps differ the panel visibly jumps
// wider or narrower when you move between reading and editing, which is the
// one-slot consistency the pick was made for.
//
// So the ramp is a constant, not a class string typed twice. A second copy
// would drift silently: nothing errors, nothing fails a test, the two panels
// just stop being one slot.
//
// The ramp itself, from /shell/form/full's measured comparison:
//   <640px   w-full   — full-bleed on a phone (390px), no wasted gutter
//   ≥640px   512px    — the shipped ProfileSheet's old cap, now a waypoint
//   ≥1024px  672px    — the picked width; 448px was rejected as the same
//                       width as the Modal the review called too narrow
//
// Width alone buys no height back — measured at zero pixels difference
// between 448px and 768px, because the two-up grid runs off Tailwind's `sm:`
// VIEWPORT breakpoint and not the panel. It buys readable line lengths for
// long values (addresses, social URLs, the executive brief), which is a
// different and real complaint.
//
// PLAIN MODULE, no directive. Both client panels import it; a `"use client"`
// module's plain constants arrive as nothing in a Server Component, and this
// one must stay importable from anywhere (CLAUDE.md § Build discipline).
export const LEAD_PANEL_WIDTH = "sm:max-w-lg lg:max-w-2xl";
