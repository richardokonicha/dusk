export class MockDatabase {
  private stmts: string[] = [];
  private pragmaValues: Record<string, any> = {
    "database_list": [{ file: ":memory:" }],
    "page_count": 100,
    "page_size": 4096,
  };
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
        if (normalizedLower.startsWith("select name from sqlite_master where type='table'")) {
          return Array.from(this.tables.keys()).map((name) => ({ name }));
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
    if (normalized === "database_list") return this.pragmaValues["database_list"];
    if (normalized === "page_count") return this.pragmaValues["page_count"];
    if (normalized === "page_size") return this.pragmaValues["page_size"];
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

export default MockDatabase;