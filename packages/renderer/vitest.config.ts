import { defineConfig } from "vitest/config";
import path from "node:path";

process.env.TZ = "UTC";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../shared/src"),
    },
  },
  test: {
    name: "renderer",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "text-summary"],
      thresholds: {
        lines: 17,
        functions: 49,
        branches: 64,
        statements: 17,
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
    deps: {
      inline: ["framer-motion"],
    },
  },
});
