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
    // Written by scripts/generate-types.sh from the backend OpenAPI spec. Style
    // rules cannot be satisfied here without editing a file the next run
    // overwrites, and the bounds it mirrors are meant to read as the numbers the
    // backend enforces.
    "lib/generated/**",
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
      // MAGIC NUMBERS - Require named constants for all numeric literals
      // ═══════════════════════════════════════════════════════════════════════

      // Disable base rule in favor of TypeScript-aware version
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          // Only universally-understood values are exempt
          ignore: [0, 1, -1],
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          enforceConst: true,
          ignoreDefaultValues: true,
        },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // BUG PREVENTION - Common sources of runtime errors
      // ═══════════════════════════════════════════════════════════════════════

      // Always use === instead of == (prevents type coercion bugs)
      eqeqeq: ["error", "always"],

      // No console.log in production (allow warn/error for debugging)
      "no-console": ["error", { allow: ["warn", "error"] }],

      // Prevent accidental mutation of function parameters
      "no-param-reassign": ["error", { props: false }],

      // Limit nesting depth to keep code readable
      "max-depth": ["error", 4],

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
  // Relaxed rules for test files - magic numbers and console are acceptable
  {
    files: ["__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "no-console": "off",
      "max-depth": "off",
    },
  },
  // Relaxed rules for config files
  {
    files: [
      "*.config.ts",
      "*.config.*.ts",
      "*.config.mjs",
      "vitest.config.ts",
      "playwright.config.ts",
      "playwright.config.prod.ts",
      "tailwind.config.ts",
    ],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
    },
  },
]);

export default eslintConfig;
