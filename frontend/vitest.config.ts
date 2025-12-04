import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["lib/**/*.{ts,tsx}"],
      exclude: [
        "lib/providers.tsx", // React providers don't need unit tests
        "lib/constants/**", // Constants files are just data, no logic to test
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 65, // Lower for functions since API HTTP methods are tested via E2E
        branches: 70,
        statements: 70,
      },
    },
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
