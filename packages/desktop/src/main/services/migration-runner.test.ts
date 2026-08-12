import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

class MockDatabase {
  private stmts: string[] = [];
  private tables: Map<string, Set<string>> = new Map();
  private indexes: Map<string, string[]> = new Map();
  private migrations: any[] = [];
  private migrationId = 0;

  exec(sql: string) {
    this.stmts.push(sql);
    this.parseExec(sql);
  }

  prepare(sql: string) {
    const normalized = sql.trim().toUpperCase();
    const normalizedLower = sql.trim().toLowerCase();

    return {
      run: (...args: any[]) => {
        if (normalized.startsWith("INSERT INTO DRIZZLE_MIGRATIONS")) {
          this.migrationId++;
          this.migrations.push({
            id: this.migrationId,
            name: args[0],
            hash: args[1],
            applied_at: Math.floor(Date.now() / 1000),
          });
        }
        return { changes: 0, lastInsertRowid: 0 };
      },
      all: () => {
        if (normalizedLower.startsWith("select name from drizzle_migrations")) {
          return this.migrations.map((m) => ({ name: m.name }));
        }
        if (normalizedLower.startsWith("select count(*) as count from sqlite_master")) {
          return [{ count: this.tables.size }];
        }
        if (normalizedLower.startsWith("select count(*) as count from drizzle_migrations")) {
          return [{ count: this.migrations.length }];
        }
        if (normalizedLower.startsWith("select * from drizzle_migrations")) {
          return this.migrations;
        }
        if (normalizedLower.startsWith("select id, name, hash, applied_at as appliedat from drizzle_migrations")) {
          return this.migrations.map((m) => ({ ...m, appliedAt: m.applied_at }));
        }
        if (normalizedLower.startsWith("select name from sqlite_master where type='table'")) {
          return Array.from(this.tables.keys()).map((name) => ({ name }));
        }
        if (normalizedLower.startsWith("pragma table_info(")) {
          const match = sql.match(/pragma table_info\((\w+)\)/i);
          if (match) {
            const tableName = match[1];
            const columns = this.tables.get(tableName);
            if (columns) {
              return Array.from(columns).map((col, idx) => ({ name: col, cid: idx }));
            }
          }
          return [];
        }
        if (normalizedLower.startsWith("select name from sqlite_master where type='index' and tbl_name=")) {
          const match = sql.match(/tbl_name='(\w+)'/i);
          if (match) {
            const tableName = match[1];
            const tableIndexes = this.indexes.get(tableName) || [];
            return tableIndexes.map((name) => ({ name }));
          }
          return [];
        }
        return [];
      },
      get: () => {
        if (normalizedLower.startsWith("select count(*) as count from sqlite_master")) {
          return { count: this.tables.size };
        }
        if (normalizedLower.startsWith("select count(*) as count from drizzle_migrations")) {
          return { count: this.migrations.length };
        }
        return undefined;
      },
    };
  }

  transaction<T>(fn: (...args: any[]) => T) {
    return (...args: any[]) => fn(...args);
  }

  close() {
    this.stmts = [];
    this.tables = new Map();
    this.indexes = new Map();
    this.migrations = [];
    this.migrationId = 0;
  }

  pragma(sql: string) {
    const normalized = sql.trim().toLowerCase();
    if (normalized === "database_list") return [{ file: ":memory:" }];
    if (normalized === "page_count") return 100;
    if (normalized === "page_size") return 4096;
    if (normalized.startsWith("pragma table_info(")) {
      const match = sql.match(/pragma table_info\((\w+)\)/i);
      if (match) {
        const tableName = match[1];
        const columns = this.tables.get(tableName);
        if (columns) {
          return Array.from(columns).map((col, idx) => ({ name: col, cid: idx }));
        }
      }
      return [];
    }
    return [];
  }

  private parseExec(sql: string) {
    const normalized = sql.trim().toUpperCase();

    if (normalized.startsWith("CREATE TABLE IF NOT EXISTS")) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) {
        const tableName = match[1];
        this.tables.set(tableName, new Set());
        const columnMatches = sql.matchAll(/^\s*(\w+)\s+(TEXT|INTEGER|REAL|BLOB)/gmi);
        for (const m of columnMatches) {
          this.tables.get(tableName)!.add(m[1]);
        }
      }
    } else if (normalized.startsWith("ALTER TABLE")) {
      const match = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
      if (match) {
        const [, tableName, columnName] = match;
        if (!this.tables.has(tableName)) {
          throw new Error(`Cannot add column to non-existent table: ${tableName}`);
        }
        this.tables.get(tableName)!.add(columnName);
      }
    } else if (normalized.startsWith("CREATE INDEX IF NOT EXISTS")) {
      const match = sql.match(/CREATE INDEX IF NOT EXISTS (\w+) ON (\w+)\((\w+)\)/i);
      if (match) {
        const [, indexName, tableName] = match;
        if (!this.indexes.has(tableName)) {
          this.indexes.set(tableName, []);
        }
        this.indexes.get(tableName)!.push(indexName);
      }
    }
  }
}

vi.mock("better-sqlite3", () => ({
  default: MockDatabase,
}));

import { MigrationRunner } from "../services/migration-runner";

describe("MigrationRunner", () => {
  let db: InstanceType<typeof MockDatabase>;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new (MockDatabase as any)(":memory:");
    runner = new MigrationRunner(db as any);
  });

  afterEach(() => {
    db.close();
  });

  describe("runAll", () => {
    it("applies both migrations on fresh database", async () => {
      const result = await runner.runAll();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual(["0001_initial_schema", "0002_stream_checkpoints"]);
      expect(result.failed).toBeUndefined();
    });

    it("skips already-applied migrations", async () => {
      await runner.runAll();
      const result = await runner.runAll();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([]);
    });

    it("creates all expected tables", async () => {
      await runner.runAll();

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[];

      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain("workspaces");
      expect(tableNames).toContain("conversations");
      expect(tableNames).toContain("messages");
      expect(tableNames).toContain("agents");
      expect(tableNames).toContain("agent_memory");
      expect(tableNames).toContain("files");
      expect(tableNames).toContain("providers");
      expect(tableNames).toContain("jobs");
      expect(tableNames).toContain("settings");
      expect(tableNames).toContain("drizzle_migrations");
    });

    it("creates stream checkpoint columns on messages", async () => {
      await runner.runAll();

      const columns = db
        .prepare("PRAGMA table_info(messages)")
        .all() as { name: string }[];

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain("stream_id");
      expect(columnNames).toContain("checkpoint");
      expect(columnNames).toContain("is_complete");
    });

    it("creates idx_messages_stream_id index", async () => {
      await runner.runAll();

      const indexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages'")
        .all() as { name: string }[];

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain("idx_messages_stream_id");
    });
  });

  describe("runInitialSchema", () => {
    it("applies only 0001 when called directly", async () => {
      const result = await runner.runInitialSchema();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual(["0001_initial_schema"]);
    });

    it("skips 0001 if already applied", async () => {
      await runner.runInitialSchema();
      const result = await runner.runInitialSchema();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([]);
    });
  });

  describe("runStreamCheckpoints", () => {
    it("applies only 0002 when called directly", async () => {
      await runner.runInitialSchema();
      const result = await runner.runStreamCheckpoints();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual(["0002_stream_checkpoints"]);
    });

    it("fails if 0001 was not run first", async () => {
      const result = await runner.runStreamCheckpoints();

      expect(result.success).toBe(false);
      expect(result.failed).toEqual(["0002_stream_checkpoints"]);
    });
  });

  describe("getAppliedMigrations", () => {
    it("returns empty set before migrations", () => {
      expect(runner.getAppliedMigrations()).toEqual(new Set());
    });

    it("returns applied migrations after running", async () => {
      await runner.runAll();
      const applied = runner.getAppliedMigrations();

      expect(applied.has("0001_initial_schema")).toBe(true);
      expect(applied.has("0002_stream_checkpoints")).toBe(true);
    });
  });

  describe("isApplied", () => {
    it("returns false for unapplied migration", () => {
      expect(runner.isApplied("0001_initial_schema")).toBe(false);
    });

    it("returns true after migration is applied", async () => {
      await runner.runInitialSchema();
      expect(runner.isApplied("0001_initial_schema")).toBe(true);
    });
  });

  describe("getMigrationHistory", () => {
    it("returns empty array before migrations", () => {
      expect(runner.getMigrationHistory()).toEqual([]);
    });

    it("returns history after migrations are applied", async () => {
      await runner.runAll();
      const history = runner.getMigrationHistory();

      expect(history).toHaveLength(2);
      expect(history[0].name).toBe("0001_initial_schema");
      expect(history[1].name).toBe("0002_stream_checkpoints");
      expect(history[0].hash).toBeTruthy();
      expect(history[1].hash).toBeTruthy();
      expect(history[0].appliedAt).toBeGreaterThan(0);
      expect(history[1].appliedAt).toBeGreaterThan(0);
    });
  });
});
