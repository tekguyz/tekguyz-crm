import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// THE FENCE, PINNED. The /login redesign's Stage 1 is comps only: the real
// sign-in surfaces and the code behind them must not change until a Stage 2
// prompt wires the pick. This asks git, not a reviewer.
//
// BASE is the commit this exploration started from. `git diff --stat BASE`
// compares it with the working tree, so it catches an edit whether or not it
// has been committed. The second check catches a NEW file dropped into one of
// these directories, which a diff against tracked files would not see.
//
// WHEN STAGE 2 WIRES THE PICK, this test is expected to fail — update BASE to
// the wiring commit or delete the test in that prompt, deliberately.
const BASE = "47313dd";

const FENCED = [
  "src/app/(auth)/login",
  "src/app/(auth)/signup",
  "src/app/invite/[token]",
  "src/lib/auth/actions.ts",
  "middleware.ts",
  "src/lib/supabase/middleware.ts",
];

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

describe("the /login comps leave the real auth surfaces alone", () => {
  it(`git diff --stat ${BASE} is empty for every fenced path`, () => {
    expect(git("diff", "--stat", BASE, "--", ...FENCED)).toBe("");
  });

  it("no untracked file has appeared under a fenced path", () => {
    expect(git("ls-files", "--others", "--exclude-standard", "--", ...FENCED)).toBe("");
  });
});
