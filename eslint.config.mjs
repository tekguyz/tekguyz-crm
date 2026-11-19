import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // New in eslint-config-next 16 (react-hooks v7). Off to keep the lint
      // result the same as before the minimatch fix; turning them on is a
      // separate job (20 findings).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      // Server Actions bound to useActionState must keep the (prevState,
      // formData) signature even when unused — underscore-prefix marks intent.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
