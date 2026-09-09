// The className every variant's tab bar is given inside PhoneFrame: `absolute`
// instead of the shipped `fixed` (so it pins to the 375px frame rather than to
// the window) and `md:flex` to undo the shipped `md:hidden`, since a small box
// inside a desktop page is still a desktop viewport.
//
// IN A PLAIN MODULE, NOT IN PreviewSurface.tsx, AND THAT IS LOAD-BEARING.
// PreviewSurface is a "use client" file. Next replaces such a module with
// client-reference proxies, so a Server Component importing a plain constant
// from it does not get the string — it gets a reference, and passing that as a
// className produced a tab bar whose class list simply ended at `fixed
// md:hidden` with the override silently absent. No error, no warning, green
// build, passing types: the phone comp just rendered its bar pinned across the
// bottom of the whole page. Same failure shape as the `"use server"` rule in
// CLAUDE.md § Build discipline — a module directive quietly changes what a
// non-component export is worth to its importer.
export const PHONE_TAB_BAR_OVERRIDE = "absolute md:flex";
