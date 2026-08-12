import Database from "better-sqlite3";

export interface MigrationRecord {
  id: number;
  name: string;
  hash: string;
  appliedAt: number;
}

export interface MigrationResult {
  success: boolean;
  applied: string[];
  failed?: string[];
  error?: Error;
}

export class MigrationRunner {
  private db: Database.Database;
  private migrationsTable = "drizzle_migrations";

  constructor(db: Database.Database) {
    this.db = db;
  }

  async run(migrations: Record<string, () => Promise<void>>): Promise<MigrationResult> {
    const applied: string[] = [];
    const failed: string[] = [];

    try {
      this.ensureMigrationsTable();
      const existing = this.getAppliedMigrations();

      for (const [name, fn] of Object.entries(migrations)) {
        if (existing.has(name)) {
          continue;
        }

        try {
          await this.withTransaction(async () => {
            await fn();
            this.recordMigration(name);
          });
          applied.push(name);
        } catch (err) {
          failed.push(name);
          throw new Error(`Migration "${name}" failed: ${err}`);
        }
      }

      return { success: true, applied };
    } catch (error) {
      return {
        success: false,
        applied,
        failed,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  getAppliedMigrations(): Set<string> {
    const rows = this.db
      .prepare(`SELECT name FROM ${this.migrationsTable}`)
      .all() as MigrationRecord[];
    const set = new Set<string>();
    for (const row of rows) {
      set.add(row.name);
    }
    return set;
  }

  isApplied(name: string): boolean {
    return this.getAppliedMigrations().has(name);
  }

  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        hash TEXT NOT NULL,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);
  }

  private recordMigration(name: string): void {
    const hash = this.hashMigration(name);
    this.db
      .prepare(`INSERT INTO ${this.migrationsTable} (name, hash) VALUES (?, ?)`)
      .run(name, hash);
  }

  private hashMigration(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  private async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    return result;
  }
}
