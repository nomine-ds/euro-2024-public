import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
        include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
        exclude: [
          "**/*.d.ts",
          "**/__tests__/**",
          "**/*.test.*",
          "**/*.spec.*",
          "**/layout.tsx",
        ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 18,
        statements: 20,
      },
    },
  },
  resolve: {
    alias: { "@": frontendRoot },
  },
});
