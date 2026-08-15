import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Separate config for the live RLS/role-enforcement suites. These are the
// Vitest form of the disposable service-role script pattern this project has
// used for every adversarial database check so far (Task/Calendar Prompt 1,
// the vault_clear_org_credential MEMBER test) — same fixtures, same teardown,
// just runnable on demand instead of written fresh each time.
//
// Kept out of `npm test` on purpose (see the exclude in vitest.config.mts):
// they need network, real credentials, and ~30s, and they create then delete
// real auth users. Run with `npm run test:rls`.
//
// - node environment, not jsdom, and no React setup file — there is no DOM here.
// - loadEnv(..., "") with an empty prefix pulls the whole .env (including the
//   non-VITE_/non-NEXT_PUBLIC_ service key) into process.env for the run.
//   Vitest does not read .env into process.env on its own, and Node's
//   --env-file cannot be passed through the vitest binary cross-platform.
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["src/**/*.rls.test.ts"],
    globals: false,
    env: loadEnv(mode, process.cwd(), ""),
    // Each suite signs in three separate users against the hosted project.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
