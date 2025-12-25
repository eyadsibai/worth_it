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
  ]),
  // Strict rules - enforce code quality standards
  {
    rules: {
      // ═══════════════════════════════════════════════════════════════════════
      // TYPE SAFETY - Catch bugs before they happen
      // ═══════════════════════════════════════════════════════════════════════

      // Unused variables should be errors, not warnings
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Prevent 'any' from defeating TypeScript's purpose
      "@typescript-eslint/no-explicit-any": "error",

      // ═══════════════════════════════════════════════════════════════════════
      // BUG PREVENTION - Common sources of runtime errors
      // ═══════════════════════════════════════════════════════════════════════

      // Always use === instead of == (prevents type coercion bugs)
      eqeqeq: ["error", "always"],

      // No console.log in production (allow warn/error for debugging)
      "no-console": ["error", { allow: ["warn", "error"] }],

      // ═══════════════════════════════════════════════════════════════════════
      // CODE QUALITY - Best practices
      // ═══════════════════════════════════════════════════════════════════════

      // Require explicit return types on exported functions (better APIs)
      "@typescript-eslint/explicit-module-boundary-types": "off", // Too strict for React

      // Note: prefer-nullish-coalescing and prefer-optional-chain require
      // type-aware linting which significantly slows down CI. Use TypeScript
      // strict mode in tsconfig.json for these checks instead.
    },
  },
]);

export default eslintConfig;
