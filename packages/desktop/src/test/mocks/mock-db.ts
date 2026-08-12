import { vi } from "vitest";

export function createMockDatabase() {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const mockDb = {
    prepare: vi.fn((sql: string) => ({
      run: vi.fn((...params: unknown[]) => {
        statements.push({ sql, params });
        return { changes: 1, lastInsertRowid: BigInt(1) };
      }),
      get: vi.fn((...params: unknown[]) => {
        statements.push({ sql, params });
        return { id: 1 };
      }),
      all: vi.fn((...params: unknown[]) => {
        statements.push({ sql, params });
        return [];
      }),
    })),
    exec: vi.fn((sql: string) => {
      statements.push({ sql, params: [] });
    }),
    transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockDb)),
    close: vi.fn(),
    inTransaction: vi.fn().mockReturnValue(false),
  };

  return {
    db: mockDb,
    statements,
    clearStatements: () => statements.length = 0,
  };
}

export const mockDb = createMockDatabase();
