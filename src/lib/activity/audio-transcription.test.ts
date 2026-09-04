import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guard, deliberately.
//
// The real proof that the public demo cannot spend Gemini credit is
// src/lib/demo/demo-visitor.rls.test.ts, which shows the demo identity cannot
// upload to storage or insert an activity_logs row, and so never reaches
// transcribeAndSaveAudioNote at all.
//
// The obvious unit test here — mock everything and assert resolveOrgCredential
// was not called — would need the first `@/lib/supabase/server` mock in this
// repo (there are none), because the function calls createClient() which pulls
// in next/headers. Mocking every collaborator of a three-line guard proves the
// mocks work, not the code.
//
// What CAN silently regress is ORDERING: move the is_demo check below
// transcribeOrFallback and nothing fails — the build is green, every other
// test passes — but the guard stops holding whenever PLATFORM_GEMINI_API_KEY
// is set, which it is in production. That is the same silent-failure shape as
// the `outline-none` regression this project already guards at the source
// level in src/components/ui/dropdown-menu.test.tsx.
// Resolved from the repo root, not from import.meta.url: the main vitest
// config runs in the jsdom environment, where import.meta.url is not a file:
// URL and fileURLToPath throws "The URL must be of scheme file".
const SOURCE = readFileSync(
  join(process.cwd(), "src/lib/activity/audio-transcription.ts"),
  "utf8",
);

describe("the demo transcription guard", () => {
  it("checks is_demo before resolving any Gemini credential", () => {
    const guardAt = SOURCE.indexOf("isDemoOrg(organizationId)");
    const resolveAt = SOURCE.indexOf("resolveOrgCredential(");

    expect(guardAt, "isDemoOrg(organizationId) call not found").toBeGreaterThan(-1);
    expect(resolveAt, "resolveOrgCredential( call not found").toBeGreaterThan(-1);
    expect(
      guardAt,
      "the is_demo guard must run BEFORE resolveOrgCredential, or it stops holding once PLATFORM_GEMINI_API_KEY is set",
    ).toBeLessThan(resolveAt);
  });

  it("returns the demo message instead of transcribing", () => {
    expect(SOURCE).toContain("Voice notes are not transcribed in the public demo.");
    expect(SOURCE).toMatch(/isDemo\s*\?\s*DEMO_SKIP_MESSAGE/);
  });

  it("never constructs a Gemini client outside transcribeOrFallback", () => {
    // GoogleGenAI is only ever instantiated inside the fallback helper, which
    // the demo path skips entirely. If a second `new GoogleGenAI` appears, the
    // guard above no longer covers every route to a billed call.
    const constructions = SOURCE.match(/new GoogleGenAI\(/g) ?? [];
    expect(constructions).toHaveLength(1);
  });
});
