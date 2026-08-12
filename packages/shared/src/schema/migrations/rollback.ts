import Database from "better-sqlite3";

export interface RollbackOptions {
  steps: number;
  dryRun?: boolean;
}

export class RollbackRunner {
  private db: Database.Database;
  private migrationsTable = "drizzle_migrations";

  constructor(db: Database.Database) {
    this.db = db;
  }

  rollback(options: RollbackOptions): { rolledBack: string[] } {
    const rows = this.db
      .prepare(`SELECT name, id FROM ${this.migrationsTable} ORDER BY id DESC LIMIT ?`)
      .all(options.steps) as { name: string; id: number }[];

    const rolledBack: string[] = [];

    for (const row of rows) {
      if (options.dryRun) {
        rolledBack.push(row.name);
        continue;
      }
      this.rollbackMigration(row.name, row.id);
      rolledBack.push(row.name);
    }

    return { rolledBack };
  }

  private rollbackMigration(name: string, id: number): void {
    this.db.transaction(() => {
      this.db.prepare(`DELETE FROM ${this.migrationsTable} WHERE id = ?`).run(id);
    })();
  }
}
