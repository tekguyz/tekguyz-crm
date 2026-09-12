// The three sections every Settings variant carries, in one shared list — the
// same reason detail/preview/sections.ts holds its five: three variants that
// each restate the section list can differ by a typo, and that difference
// would be read as a design difference.
//
// IN A PLAIN MODULE, NOT BESIDE THE BLOCKS. SettingsBlocks.tsx is a
// "use client" file, and a Server Component importing a plain constant from
// one gets a client-reference proxy rather than the value — no error, no
// warning, green build, and the list simply arrives as nothing. The variant
// pages are server components, so this list cannot live there.
// See CLAUDE.md § Build discipline.
export type SettingsSectionId = "profile" | "branding" | "webhook";

export const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  blurb: string;
}[] = [
  {
    id: "profile",
    label: "Organization profile",
    blurb:
      "The name on this workspace, and the timezone and currency every date and amount in the app is formatted with.",
  },
  {
    id: "branding",
    label: "Branding",
    blurb:
      "The mark this workspace shows, and the two rules that decide which asset is used.",
  },
  {
    id: "webhook",
    label: "Inbound lead webhook",
    blurb:
      "Where enquiries arrive, and the key that signs them. The URL is public; the secret is not.",
  },
];
