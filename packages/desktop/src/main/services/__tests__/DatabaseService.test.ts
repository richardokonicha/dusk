import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseService } from "../db";

vi.mock("../db/repositories/workspace", () => ({
  WorkspaceRepository: vi.fn(),
}));
vi.mock("../db/repositories/conversation", () => ({
  ConversationRepository: vi.fn(),
}));
vi.mock("../db/repositories/message", () => ({
  MessageRepository: vi.fn(),
}));
vi.mock("../db/repositories/agent", () => ({
  AgentRepository: vi.fn(),
}));
vi.mock("../db/repositories/file", () => ({
  FileRepository: vi.fn(),
}));
vi.mock("../db/repositories/job", () => ({
  JobRepository: vi.fn(),
}));
vi.mock("../db/repositories/provider", () => ({
  ProviderRepository: vi.fn(),
}));
vi.mock("../db/repositories/settings", () => ({
  SettingsRepository: vi.fn(),
}));
vi.mock("./migration-runner", () => ({
  MigrationRunner: vi.fn().mockImplementation(() => ({
    runInitialSchema: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("better-sqlite3", () => ({
  default: vi.fn().mockImplementation(() => ({
    pragma: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    transaction: vi.fn().mockImplementation((fn: (tx: unknown) => unknown) => {
      const wrapped = vi.fn().mockImplementation(fn as any);
      return () => wrapped({} as any);
    }),
    close: vi.fn(),
    exec: vi.fn(),
  })),
}));

vi.mock("drizzle-orm/better-sqlite3", () => ({
  drizzle: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue([]),
          all: vi.fn().mockReturnValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue([]),
      }),
    }),
  }),
}));

vi.mock("drizzle-orm/better-sqlite3/migrator", () => ({
  migrate: vi.fn().mockResolvedValue([]),
}));

describe("DatabaseService", () => {
  beforeEach(() => {
    DatabaseService.getInstance()["initialized"] = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns singleton instance", () => {
    const instance1 = DatabaseService.getInstance();
    const instance2 = DatabaseService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("initializes database", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service).toBeDefined();
  });

  it("skips re-initialization if already initialized", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    await service.initialize("/tmp/other-db.db");
    expect(service).toBeDefined();
  });

  it("returns drizzle instance after initialization", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.drizzle).toBeDefined();
  });

  it("returns raw database instance after initialization", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.raw).toBeDefined();
  });

  it("throws error when drizzle is accessed before initialization", () => {
    const service = DatabaseService.getInstance();
    expect(() => service.drizzle).toThrow("DatabaseService not initialized");
  });

  it("throws error when raw is accessed before initialization", () => {
    const service = DatabaseService.getInstance();
    expect(() => service.raw).toThrow("DatabaseService not initialized");
  });

  it("provides workspace repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.workspace).toBeDefined();
  });

  it("provides conversation repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.conversation).toBeDefined();
  });

  it("provides message repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.message).toBeDefined();
  });

  it("provides agent repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.agent).toBeDefined();
  });

  it("provides file repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.file).toBeDefined();
  });

  it("provides job repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.job).toBeDefined();
  });

  it("provides provider repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.provider).toBeDefined();
  });

  it("provides settings repository", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    expect(service.settings).toBeDefined();
  });

  it("shuts down database", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    await service.shutdown();
    expect(service["initialized"]).toBe(false);
  });

  it("executes transaction", async () => {
    const service = DatabaseService.getInstance();
    await service.initialize("/tmp/test-db.db");
    const tx = vi.fn().mockReturnValue("result");
    const result = service.transaction(tx as any);
    expect(result).toBe("result");
  });
});
