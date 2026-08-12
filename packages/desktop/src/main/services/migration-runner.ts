import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

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

export interface MigrationLogEntry {
  name: string;
  status: "applied" | "failed" | "skipped";
  timestamp: number;
  durationMs: number;
  error?: string;
}

export class MigrationRunner {
  private db: Database.Database;
  private migrationsTable = "drizzle_migrations";
  private migrationDir: string;

  constructor(db: Database.Database, migrationDir?: string) {
    this.db = db;
    this.migrationDir =
      migrationDir ||
      path.join(__dirname, "..", "..", "..", "..", "shared", "src", "schema", "migrations");
  }

  async runAll(): Promise<MigrationResult> {
    const applied: string[] = [];
    const failed: string[] = [];
    const logs: MigrationLogEntry[] = [];

    try {
      this.ensureMigrationsTable();
      const existing = this.getAppliedMigrations();

      const migrations = [
        "0001_initial_schema.sql",
        "0002_stream_checkpoints.sql",
      ];

      for (const file of migrations) {
        const name = file.replace(".sql", "");
        const startTime = Date.now();

        if (existing.has(name)) {
          logs.push({
            name,
            status: "skipped",
            timestamp: startTime,
            durationMs: 0,
          });
          console.log(`[Migration] Skipping ${name} (already applied)`);
          continue;
        }

        try {
          await this.runSqlMigration(file);
          this.recordMigration(name);
          applied.push(name);
          logs.push({
            name,
            status: "applied",
            timestamp: startTime,
            durationMs: Date.now() - startTime,
          });
          console.log(`[Migration] Applied ${name} (${logs[logs.length - 1].durationMs}ms)`);
        } catch (err) {
          failed.push(name);
          const errorMessage = err instanceof Error ? err.message : String(err);
          logs.push({
            name,
            status: "failed",
            timestamp: startTime,
            durationMs: Date.now() - startTime,
            error: errorMessage,
          });
          console.error(`[Migration] Failed ${name}: ${errorMessage}`);
          throw new Error(`Migration "${name}" failed: ${errorMessage}`);
        }
      }

      this.persistMigrationLog(logs);

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

  async runInitialSchema(): Promise<MigrationResult> {
    return this.runMigrationFile("0001_initial_schema.sql");
  }

  async runStreamCheckpoints(): Promise<MigrationResult> {
    return this.runMigrationFile("0002_stream_checkpoints.sql");
  }

  async runDrizzleMigrations(sqliteDb: Database.Database): Promise<MigrationResult> {
    const applied: string[] = [];
    const failed: string[] = [];

    try {
      this.ensureMigrationsTable();
      const existing = this.getAppliedMigrations();

      await migrate(sqliteDb as unknown as Parameters<typeof migrate>[0], { migrationsFolder: this.migrationDir, migrationsTable: this.migrationsTable });
      const drizzleMigrations = this.getAppliedMigrations();
      const newMigrations = [...drizzleMigrations].filter((m) => !existing.has(m));

      for (const migration of newMigrations) {
        applied.push(migration);
        console.log(`[Migration] Applied drizzle migration ${migration}`);
      }

      return { success: true, applied };
    } catch (error) {
      console.error("[Migration] Drizzle migration failed:", error);
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

  getMigrationHistory(): MigrationRecord[] {
    return this.db
      .prepare(`SELECT id, name, hash, applied_at as appliedAt FROM ${this.migrationsTable} ORDER BY id ASC`)
      .all() as MigrationRecord[];
  }

  private async runMigrationFile(fileName: string): Promise<MigrationResult> {
    const applied: string[] = [];
    const failed: string[] = [];
    const name = fileName.replace(".sql", "");
    const startTime = Date.now();

    try {
      this.ensureMigrationsTable();

      if (this.isApplied(name)) {
        console.log(`[Migration] Skipping ${name} (already applied)`);
        return { success: true, applied };
      }

      await this.withTransaction(async () => {
        const sqlPath = path.join(this.migrationDir, fileName);
        if (!fs.existsSync(sqlPath)) {
          throw new Error(`Migration file not found: ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, "utf-8");
        const statements = sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          this.db.exec(statement);
        }

        this.recordMigration(name);
      });

      applied.push(name);
      console.log(`[Migration] Applied ${name} (${Date.now() - startTime}ms)`);
      return { success: true, applied };
    } catch (error) {
      failed.push(name);
      console.error(`[Migration] Failed ${name}:`, error);
      return {
        success: false,
        applied,
        failed,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private runSqlMigration(fileName: string): void {
    const sqlPath = path.join(this.migrationDir, fileName);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      this.db.exec(statement);
    }
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

  private persistMigrationLog(logs: MigrationLogEntry[]): void {
    try {
      const logDir = path.join(this.migrationDir, "..", "logs");
      fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(
        logDir,
        `migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      );
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch {
      console.warn("[Migration] Failed to persist migration log");
    }
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
