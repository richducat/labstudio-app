import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // The API route handlers are Next.js server code and often need flexible
  // parsing of JSON blobs / third-party payloads. Keep strict linting for UI,
  // but relax `no-explicit-any` specifically for route handlers.
  {
    files: ["src/app/api/**/route.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
