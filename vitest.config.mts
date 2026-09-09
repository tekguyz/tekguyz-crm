import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// *.rls.test.ts files talk to the real Supabase project and create/tear down
// their own auth users, so they are deliberately NOT part of `npm test` — that
// stays hermetic, offline and fast. Run them with `npm run test:rls`
// (vitest.rls.config.mts).
const sharedExclude = [...configDefaults.exclude, "src/**/*.rls.test.ts"];

// 10s, not vitest's 5s default. Several component tests drive eight or more
// fields through userEvent, which is genuinely slow rather than stuck —
// CreateLeadModal's form-reset test measures ~3s alone and timed out under
// full-suite load on an 8GB machine while passing in isolation. Kept on both
// projects so a test's budget does not change with the environment it lands in.
const testTimeout = 10_000;

// The one DOM test that is not a .tsx component test: it reads and writes
// document.cookie directly. Named in both projects — added to the jsdom
// include, removed from the node include — so the two lists stay exhaustive
// and a file can never silently belong to neither.
const DOM_TEST_IN_TS = "src/lib/shell/sidebar-cookie.test.ts";

// Two projects, split by what a test actually needs, NOT by taste.
//
// This file used to set `environment: "jsdom"` once, for everything. That is
// the React-starter default and it is wrong here: booting a fake browser is by
// far the most expensive thing in the suite, and 16 of 47 test files never
// touch the DOM. Measured on the 8 heaviest of those pure-logic files:
// `environment 52.37s` of setup against `tests 589ms` of actual assertions;
// the same 8 under `--environment=node` reported `environment 6ms`. Across the
// whole suite the figure was `Duration 81.38s ... environment 408.94s` — the
// fake browser cost 3.4x the tests it existed to support.
//
// The symptom was never "tests are slow". It was timeouts: `npm test` sat ~30
// seconds under the 120s ceiling of whatever ran it (including the vitest call
// inside scripts/check-doc-figures.mjs), so a busy machine tipped it over and
// it read as flakiness. Do not "fix" a recurrence by raising a timeout, and do
// not reach for fewer workers — capping this suite at 4 measured WORSE, 118s
// against 81s, because the constraint is memory per jsdom worker, not cores.
//
// Adding a component test? Name it *.test.tsx and it lands in `dom` with the
// setup file. Adding a pure-logic test? Name it *.test.ts and it lands in
// `node` with no DOM at all — if it then fails on `document` or `window`, that
// is the split telling you the code under test is not as pure as it looked.
export default defineConfig({
  test: {
    // Deliberately NOT `pool: "threads"`, tried and rejected on 2026-09-09.
    // Threads looked ~13s faster (54.90s against forks' 68.78s) but that gap is
    // inside this machine's noise: the SAME fork config later measured 51.98s,
    // faster than the threads run it supposedly lost to. Wall-clock here swings
    // roughly 20s with free memory, so no single-run A/B on this box proves
    // anything — take the median of several runs or do not claim a win.
    // What was not noise: across 7 threads runs, one failed 3 tests in 2 files,
    // and 5 further runs could not reproduce it, so the cause is unknown.
    // Threads share module state that forks isolate. An unexplained 1-in-7
    // failure is the exact thing this config was changed to stop, bought with a
    // speedup that may not exist. Re-enable only after that failure is
    // reproduced and explained — never for the speed alone.
    projects: [
      {
        // React's JSX transform is needed to compile the components under test.
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          // setup.ts imports @testing-library/jest-dom and @testing-library/react
          // at the top level and stubs ResizeObserver and <dialog>, all of which
          // are jsdom concerns. It belongs to this project only — that is what
          // keeps its cost off the node tests.
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.tsx", DOM_TEST_IN_TS],
          exclude: sharedExclude,
          testTimeout,
          globals: false,
          css: false,
        },
      },
      {
        // No react() plugin and no setup file: nothing here renders anything.
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: [...sharedExclude, DOM_TEST_IN_TS],
          testTimeout,
          globals: false,
          css: false,
        },
      },
    ],
  },
});
