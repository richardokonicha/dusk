import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "shared",
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "text-summary"],
      thresholds: {
        lines: 0,
        functions: 60,
        branches: 60,
        statements: 0,
      },
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.config.{ts,js}",
        "**/test/**",
        "**/__tests__/**",
      ],
    },
  },
});
