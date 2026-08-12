import type { Config } from "drizzle-kit";

export default {
  schema: "./packages/shared/src/schema/index.ts",
  out: "./packages/shared/src/schema/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./packages/shared/src/schema/migrations/dev.db"
  },
  verbose: true,
  strict: true,
  tablesFilter: ["*"],
} satisfies Config;
