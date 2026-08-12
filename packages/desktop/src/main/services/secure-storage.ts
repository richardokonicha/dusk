import { safeStorage, app } from "electron";
import { Database } from "better-sqlite3";

export class SecureStorageService {
  private db: Database | null = null;
  private initialized = false;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
    }
  }

  setDatabase(db: Database): void {
    this.db = db;
    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.db) {
      throw new Error("Database not set. Call setDatabase() first.");
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Platform secure storage is not available");
    }

    const stmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS secure_store (
        key TEXT PRIMARY KEY,
        value BLOB NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    stmt.run();

    this.initialized = true;
  }

  set(key: string, value: string): void {
    if (!this.initialized || !this.db) {
      throw new Error("SecureStorageService not initialized");
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Platform secure storage is not available");
    }

    if (!key || typeof key !== "string") {
      throw new Error("Key must be a non-empty string");
    }

    if (typeof value !== "string") {
      throw new Error("Value must be a string");
    }

    if (value.length === 0) {
      throw new Error("Value must not be empty");
    }

    const encrypted = safeStorage.encryptString(value);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO secure_store (key, value, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    stmt.run(key, Buffer.from(encrypted), now, now);
  }

  get(key: string): string | null {
    if (!this.initialized || !this.db) {
      return null;
    }

    if (!key || typeof key !== "string") {
      return null;
    }

    const stmt = this.db.prepare("SELECT value FROM secure_store WHERE key = ?");
    const row = stmt.get(key) as { value: Buffer } | undefined;

    if (!row) {
      return null;
    }

    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return null;
      }
      return safeStorage.decryptString(row.value);
    } catch {
      return null;
    }
  }

  delete(key: string): boolean {
    if (!this.initialized || !this.db) {
      return false;
    }

    if (!key || typeof key !== "string") {
      return false;
    }

    const stmt = this.db.prepare("DELETE FROM secure_store WHERE key = ?");
    const result = stmt.run(key);
    return result.changes > 0;
  }

  has(key: string): boolean {
    if (!this.initialized || !this.db) {
      return false;
    }

    if (!key || typeof key !== "string") {
      return false;
    }

    const stmt = this.db.prepare("SELECT 1 FROM secure_store WHERE key = ? LIMIT 1");
    const row = stmt.get(key) as { 1: number } | undefined;
    return !!row;
  }

  listKeys(): string[] {
    if (!this.initialized || !this.db) {
      return [];
    }

    const stmt = this.db.prepare("SELECT key FROM secure_store ORDER BY key ASC");
    const rows = stmt.all() as { key: string }[];
    return rows.map((row) => row.key);
  }

  async migrateFromPlaintext(
    plaintextStore: Record<string, string>
  ): Promise<{ migrated: number; failed: number }> {
    if (!this.initialized || !this.db) {
      throw new Error("SecureStorageService not initialized");
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Platform secure storage is not available");
    }

    let migrated = 0;
    let failed = 0;

    for (const [key, value] of Object.entries(plaintextStore)) {
      try {
        this.set(key, value);
        migrated++;
      } catch {
        failed++;
      }
    }

    return { migrated, failed };
  }
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}
