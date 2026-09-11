// A quiet scrollbar for the panel's scrollers.
//
// The default Chromium scrollbar is a wide, hard-edged grey bar that sits on
// the panel's right edge — the loudest element in a design system whose whole
// premise is that structure comes from hairlines. It also changes width
// between platforms, so the panel's usable width is not the same on two
// machines.
//
// Deliberately not "styled": no colour, no gradient, no hover animation beyond
// the one tone step. Thumb is `--hairline`, the same token every structural
// border in the app already uses, on a transparent track. It reads as part of
// the border language rather than as a control.
//
// STANDARD PROPERTIES FIRST, webkit as the fallback. Chromium 121+ and Firefox
// both support `scrollbar-width`/`scrollbar-color`, and where they are
// supported they WIN over ::-webkit-scrollbar — so the webkit block is not a
// duplicate, it is the older-Chromium and Safari path. Both are listed because
// dropping either leaves one engine on the default bar.
//
// IN A PLAIN MODULE, no directive: the server pages and the client panels both
// import it. Same rule as mock-lead.ts and frames.ts.
//
// A comp-local constant rather than a rule in globals.css, because Stage 1 is
// comps only and a scrollbar treatment is a global design decision — it should
// not land app-wide off the back of an unpicked variant. Promoting it is one
// rule in globals.css and is Stage 2 work, not a second copy.
export const QUIET_SCROLLBAR = [
  "[scrollbar-width:thin]",
  "[scrollbar-color:var(--hairline)_transparent]",
  "[&::-webkit-scrollbar]:w-2",
  "[&::-webkit-scrollbar]:h-2",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-hairline",
].join(" ");
