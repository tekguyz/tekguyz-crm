// Sidebar collapse state is persisted in a cookie, NOT in localStorage.
//
// localStorage cannot be read on the server and cannot be read before
// hydration, so a localStorage-backed sidebar renders expanded on the first
// paint and snaps to collapsed a frame later — a visible flash of the wrong
// state on every single navigation for anyone who prefers the rail. A cookie
// travels with the request, so `src/app/(app)/layout.tsx` reads it during
// render and the server-generated HTML already carries the correct width.
//
// Plain document.cookie rather than a Server Action: this is a UI preference
// with no database surface, and round-tripping every toggle through the server
// would make an instant control feel networked.

export const SIDEBAR_COOKIE_NAME = "tg_sidebar";

export type SidebarState = "expanded" | "collapsed";

// One year. The preference should outlive a session; there is nothing to
// expire because nothing here is sensitive.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Expanded is the default for an unset cookie: a first-time user should see
// labels, not an unexplained column of icons.
export function parseSidebarState(raw: string | undefined): SidebarState {
  return raw === "collapsed" ? "collapsed" : "expanded";
}

export function writeSidebarCookie(state: SidebarState) {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${state}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}
