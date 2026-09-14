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
