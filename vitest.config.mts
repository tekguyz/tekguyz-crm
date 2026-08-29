import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // 10s, not vitest's 5s default. Several component tests drive eight or
    // more fields through userEvent, which is genuinely slow rather than
    // stuck — CreateLeadModal's form-reset test measures ~3s alone and timed
    // out under full-suite load on an 8GB machine while passing in isolation.
    // Set here rather than per test: the cause is machine speed, so it applies
    // to every test equally, and a per-test override would only move the next
    // flake to a different file.
    testTimeout: 10_000,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // *.rls.test.ts files talk to the real Supabase project and create/tear
    // down their own auth users, so they are deliberately NOT part of
    // `npm test` — that stays hermetic, offline and fast. Run them with
    // `npm run test:rls` (vitest.rls.config.mts).
    exclude: [...configDefaults.exclude, "src/**/*.rls.test.ts"],
    globals: false,
    css: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
