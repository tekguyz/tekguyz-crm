import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A SOURCE-LEVEL TEST, deliberately — same shape as panel-width.test.ts and
// card-fields.test.ts. What it pins is where things LIVE on /settings since the
// Variant Split wiring (2026-09-13):
//
// 1. The page composes exactly the four real panels, once each, each inside a
//    SettingsSection row.
// 2. A section's name lives once, in SettingsSection. A panel that grows its
//    own <h2> or Card back says its name twice and nests a surface in a surface
//    — no error, every render test still green.
// 3. Every field name renders in exactly ONE settings file. A layout edit that
//    copies a field block leaves two inputs posting the same name, and
//    FormData then reads whichever comes first.
const DIR = fileURLToPath(new URL(".", import.meta.url));
const PAGE = fileURLToPath(new URL("../../app/(app)/settings/page.tsx", import.meta.url));
// Comments stripped: several of these files explain, in prose, the <h2> and
// Card they no longer render, and that prose is not markup. The line-comment
// pattern needs leading whitespace so a URL's `//` survives.
const read = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

const PANELS = ["OrgDetailsPanel", "TeamPanel", "ApiKeysPanel", "AccountPanel"] as const;

// Every name= the four panels' Server Actions read — see CLAUDE.md
// § Form/Action Field Parity.
const FIELD_FILES: Record<string, string> = {
  name: "OrgDetailsPanel.tsx",
  timezone: "OrgDetailsPanel.tsx",
  currency_format: "OrgDetailsPanel.tsx",
  email: "InviteMemberForm.tsx",
  role: "InviteMemberForm.tsx",
  api_key_gemini: "ApiKeysPanel.tsx",
  api_key_anthropic: "ApiKeysPanel.tsx",
  display_name: "AccountPanel.tsx",
  notify_new_lead: "AccountPanel.tsx",
  notify_weekly_report: "AccountPanel.tsx",
};

const SETTINGS_FILES = [
  ...PANELS.map((p) => `${p}.tsx`),
  "InviteMemberForm.tsx",
  "MemberRow.tsx",
  "SettingsSection.tsx",
];

describe("/settings is Variant Split over the four real panels", () => {
  const page = read(PAGE);

  it("renders each of the four panels exactly once", () => {
    for (const panel of PANELS) {
      expect(page).toContain(`from "@/components/settings/${panel}"`);
      expect(page.match(new RegExp(`<${panel}\\b`, "g"))).toHaveLength(1);
    }
  });

  it("wraps them in one SettingsSplit with four SettingsSection rows", () => {
    expect(page.match(/<SettingsSplit\b/g)).toHaveLength(1);
    expect(page.match(/<SettingsSection\b/g)).toHaveLength(PANELS.length);
  });

  it("renders no page heading of its own — the shell header carries the title", () => {
    expect(page).not.toMatch(/<h1\b/);
  });

  it("SettingsSection is the one place a section heading is rendered", () => {
    expect(read(`${DIR}SettingsSection.tsx`).match(/<h2\b/g)).toHaveLength(1);
  });

  for (const panel of PANELS) {
    it(`${panel} renders no heading and no Card of its own`, () => {
      const source = read(`${DIR}${panel}.tsx`);
      expect(source).not.toMatch(/<h[12]\b/);
      expect(source).not.toMatch(/<Card\b/);
    });
  }

  for (const [field, owner] of Object.entries(FIELD_FILES)) {
    it(`name="${field}" renders in ${owner} and nowhere else`, () => {
      const pattern = new RegExp(`\\bname="${field}"`);
      const holders = SETTINGS_FILES.filter((file) => pattern.test(read(`${DIR}${file}`)));
      expect(holders).toEqual([owner]);
    });
  }
});
