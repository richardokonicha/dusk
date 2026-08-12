import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import {
  workspaces,
  conversations,
  messages,
  agents,
  agentMemory,
  files,
  providers,
  jobs,
  settings,
} from "../../../../shared/dist/src/schema/index.js";
import type {
  Workspace,
  Conversation,
  Message,
  Agent,
  AgentMemory,
  File,
  Provider,
  Job,
  Setting,
  NewWorkspace,
  NewConversation,
  NewMessage,
  NewAgent,
  NewAgentMemory,
  NewFile,
  NewProvider,
  NewJob,
  NewSetting,
} from "../../../../shared/dist/src/types/db.js";
import { WorkspaceRepository } from "../db/repositories/workspace";
import { ConversationRepository } from "../db/repositories/conversation";
import { MessageRepository } from "../db/repositories/message";
import { AgentRepository } from "../db/repositories/agent";
import { FileRepository } from "../db/repositories/file";
import { JobRepository } from "../db/repositories/job";
import { ProviderRepository } from "../db/repositories/provider";
import { SettingsRepository } from "../db/repositories/settings";
import { MigrationRunner } from "./migration-runner";

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db!: Database.Database;
  private drizzleDb!: ReturnType<typeof drizzle>;
  private initialized = false;
  private lastHealthCheck = 0;
  private healthStatus: { healthy: boolean; checkedAt: number } = {
    healthy: false,
    checkedAt: 0,
  };

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(dbPath?: string): Promise<void> {
    if (this.initialized) return;

    const resolvedPath =
      dbPath ||
      path.join(app.getPath("userData"), "dusk.db");

    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");

    this.drizzleDb = drizzle(this.db, {
      schema: {
        workspaces,
        conversations,
        messages,
        agents,
        agentMemory,
        files,
        providers,
        jobs,
        settings,
      },
    });

    const runner = new MigrationRunner(this.db);
    const result = await runner.runAll();

    if (!result.success) {
      console.error("[Database] Migration failed:", result.error);
      throw result.error || new Error("Database migration failed");
    }

    if (result.applied.length > 0) {
      console.log(`[Database] Applied ${result.applied.length} migration(s):`, result.applied.join(", "));
    }

    this.initialized = true;
    await this.healthCheck();
  }

  get drizzle() {
    if (!this.initialized) {
      throw new Error("DatabaseService not initialized. Call initialize() first.");
    }
    return this.drizzleDb;
  }

  get raw() {
    if (!this.initialized) {
      throw new Error("DatabaseService not initialized. Call initialize() first.");
    }
    return this.db as any;
  }

  get workspace() {
    return new WorkspaceRepository(this.drizzleDb);
  }

  get conversation() {
    return new ConversationRepository(this.drizzleDb);
  }

  get message() {
    return new MessageRepository(this.drizzleDb);
  }

  get agent() {
    return new AgentRepository(this.drizzleDb);
  }

  get file() {
    return new FileRepository(this.drizzleDb);
  }

  get job() {
    return new JobRepository(this.drizzleDb);
  }

  get provider() {
    return new ProviderRepository(this.drizzleDb);
  }

  get settings() {
    return new SettingsRepository(this.drizzleDb);
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const now = Date.now();
    if (now - this.lastHealthCheck < 5000 && this.healthStatus.checkedAt > 0) {
      return {
        healthy: this.healthStatus.healthy,
        details: { cached: true, checkedAt: this.healthStatus.checkedAt },
      };
    }

    const details: Record<string, unknown> = {};
    let healthy = false;

    try {
      const pragmaResult = this.db.pragma("database_list") as Array<{ file: string }>;
      details.databases = pragmaResult.map((r) => r.file);

      const pageCount = this.db.pragma("page_count") as number;
      const pageSize = this.db.pragma("page_size") as number;
      details.pageCount = pageCount;
      details.pageSize = pageSize;
      details.sizeBytes = pageCount * pageSize;

      const tableCount = this.db
        .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        .get() as { count: number };
      details.tableCount = tableCount.count;

      const migrationCount = this.db
        .prepare("SELECT COUNT(*) as count FROM drizzle_migrations")
        .get() as { count: number };
      details.migrationCount = migrationCount.count;

      healthy = true;
      this.healthStatus = { healthy: true, checkedAt: now };
    } catch (error) {
      details.error = error instanceof Error ? error.message : String(error);
      this.healthStatus = { healthy: false, checkedAt: now };
    }

    this.lastHealthCheck = now;
    return { healthy, details };
  }

  isHealthy(): boolean {
    return this.healthStatus.healthy;
  }

  async shutdown(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      this.healthStatus = { healthy: false, checkedAt: 0 };
    }
  }

  transaction<T>(fn: (tx: Database.Database) => T): T {
    return this.db.transaction(fn)(this.db);
  }
}
