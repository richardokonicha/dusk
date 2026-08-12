import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  settings,
  type Setting,
  type NewSetting,
} from "../../../../../shared/dist/src/schema/index.js";

export class SettingsRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async findAll(): Promise<Setting[]> {
    return this.db.select().from(settings).orderBy(asc(settings.key)).all();
  }

  async findById(key: string): Promise<Setting | undefined> {
    return this.db.select().from(settings).where(eq(settings.key, key)).get();
  }

  async get(key: string): Promise<string | undefined> {
    const setting = await this.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .get();
    return setting?.value;
  }

  async getMany(keys: string[]): Promise<Map<string, string>> {
    const results = await this.db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(sql`${settings.key} IN (${keys.join(", ")})`)
      .all();

    const map = new Map<string, string>();
    for (const row of results) {
      map.set(row.key, row.value);
    }
    return map;
  }

  async getAll(): Promise<Map<string, string>> {
    const results = await this.db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .all();

    const map = new Map<string, string>();
    for (const row of results) {
      map.set(row.key, row.value);
    }
    return map;
  }

  async set(key: string, value: string): Promise<Setting> {
    const existing = await this.findById(key);
    if (existing) {
      const [setting] = await this.db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return setting;
    }

    const [setting] = await this.db
      .insert(settings)
      .values({
        key,
        value,
        updatedAt: new Date(),
      })
      .returning();
    return setting;
  }

  async setMany(entries: Array<{ key: string; value: string }>): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const entry of entries) {
        const existing = await tx.select().from(settings).where(eq(settings.key, entry.key)).get();
        if (existing) {
          await tx.update(settings).set({ value: entry.value, updatedAt: new Date() }).where(eq(settings.key, entry.key)).run();
        } else {
          await tx.insert(settings).values({ key: entry.key, value: entry.value, updatedAt: new Date() }).run();
        }
      }
    });
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(settings).where(eq(settings.key, key)).run();
  }

  async deleteMany(keys: string[]): Promise<void> {
    await this.db.delete(settings).where(sql`${settings.key} IN (${keys.join(", ")})`).run();
  }
}
