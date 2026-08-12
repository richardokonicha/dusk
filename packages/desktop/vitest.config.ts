import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/main"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      "@shared/schema": path.resolve(__dirname, "../shared/src/schema/index.ts"),
      "@desktop": path.resolve(__dirname, "./src/main"),
    },
  },
  test: {
    name: "desktop",
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/main/**/*.{test,spec}.{ts,tsx}",
      "src/main/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "text-summary"],
      thresholds: {
        lines: 25,
        functions: 45,
        branches: 70,
        statements: 25,
      },
      allowEmpty: false,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.config.{ts,js}",
        "**/test/**",
        "**/__tests__/**",
        "**/*.d.ts",
      ],
    },
  },
});
