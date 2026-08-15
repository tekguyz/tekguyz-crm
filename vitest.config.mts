import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
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
