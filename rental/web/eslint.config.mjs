import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Expo (React Native) app is a separate project with its own
    // tooling/lint setup; it must not be scanned by the web app's ESLint.
    "mobile/**",
    // Deno runtime source (Supabase Edge Functions) uses jsr:/npm: specifiers
    // that Next.js's Node-oriented ESLint/TS setup can't and shouldn't parse.
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
