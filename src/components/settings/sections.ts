// The four sections of /settings, named and explained once — Variant Split's
// left column, wired from the Stage 1 comp at /shell/settings/split.
//
// IN A PLAIN MODULE, NOT BESIDE A PANEL. Three of the four panels are
// "use client" files, and a Server Component (the settings page) importing a
// plain constant from one gets a client-reference proxy rather than the value —
// no error, green build, the text simply arrives as nothing. See CLAUDE.md
// § Build discipline.
//
// The heading and the explanation used to live INSIDE each panel as an <h2>
// and, for API keys, a caption. They moved here with the Split wiring so that
// no section says its own name twice. settings-layout.test.ts fails if a panel
// grows its own heading back.
export type SettingsSectionId = "organization" | "team" | "apiKeys" | "account";

export const SETTINGS_SECTIONS: Record<SettingsSectionId, { label: string; blurb: string }> = {
  organization: {
    label: "Organization",
    blurb:
      "The name on this workspace, and the timezone and currency every date and amount is formatted with. Owners and admins also find the inbound lead webhook here.",
  },
  team: {
    label: "Team",
    blurb: "Who can sign in to this workspace, the role each person holds, and open invites.",
  },
  apiKeys: {
    label: "API Keys",
    // Moved verbatim from ApiKeysPanel's own caption.
    blurb:
      "Bring your own Gemini and Anthropic keys for AI features. Leaving a field blank keeps the existing key unchanged.",
  },
  account: {
    label: "Account",
    blurb: "Your own sign-in, display name and email notifications. These apply to you, not the whole workspace.",
  },
};
