import type { Config } from "drizzle-kit";

export default {
  schema: "./packages/dusk/src/main/data/db/schemas/index.ts",
  out: "./packages/dusk/migrations/sqlite-drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./packages/dusk/migrations/sqlite-drizzle/dev.db"
  },
  verbose: true,
  strict: true,
  tablesFilter: ["*"],
} satisfies Config;
