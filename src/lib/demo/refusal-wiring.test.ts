import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Source-level guard. Every write action that throws a Supabase error must
// route it through demoAwareError, or a refused demo write in that action
// falls back to the crash-looking boundary. A bare `throw error;` coming back
// in any of these files is the regression.
const WRITE_ACTION_FILES = [
  "src/lib/tasks/actions.ts",
  "src/lib/leads/actions.ts",
  "src/lib/leads/archive-actions.ts",
  "src/lib/leads/spam-actions.ts",
  "src/lib/activity/actions.ts",
];

describe.each(WRITE_ACTION_FILES)("%s", (file) => {
  const source = readFileSync(file, "utf8");

  it("throws no Supabase error bare", () => {
    expect(source).not.toMatch(/throw (error|logError);/);
  });

  it("routes thrown Supabase errors through demoAwareError", () => {
    expect(source).toMatch(/throw await demoAwareError\(/);
  });
});

// The return-path half. These actions hand a write error back into their own
// form or caller as { error }, so a boundary never sees it. Each must build
// that message through demoAwareMessage, or a refused demo write shows the raw
// Postgres text ("permission denied for table leads") under the form. A bare
// `error: error.message` coming back in any of these files is the regression.
const RETURN_PATH_FILES = [
  "src/lib/leads/actions.ts",
  "src/lib/tasks/actions.ts",
  "src/lib/actions/prospect-actions.ts",
  "src/lib/actions/prospect-promote-actions.ts",
  "src/lib/actions/credentials-actions.ts",
  "src/lib/invites/actions.ts",
  "src/lib/account/actions.ts",
  "src/lib/organizations/actions.ts",
  "src/lib/organizations/team-actions.ts",
];

describe.each(RETURN_PATH_FILES)("%s (returned errors)", (file) => {
  const source = readFileSync(file, "utf8");

  it("returns no raw write error message", () => {
    expect(source).not.toMatch(/error: (result\.)?error\.message/);
  });

  it("builds returned errors through demoAwareMessage", () => {
    expect(source).toMatch(/demoAwareMessage\(error/);
  });
});
