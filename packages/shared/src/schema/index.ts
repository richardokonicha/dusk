import { sqliteTable, text, integer, real, blob, index } from "drizzle-orm/sqlite-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    path: text("path").notNull().unique(),
    icon: text("icon"),
    color: text("color").default("#6366F1"),
    isActive: integer("is_active", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    settings: text("settings", { mode: "json" }).$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    nameIdx: index("idx_workspaces_name").on(table.name),
  })
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    workspaceIdIdx: index("idx_conversations_workspace_id").on(table.workspaceId),
    updatedAtIdx: index("idx_conversations_updated_at").on(table.updatedAt),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["user", "assistant", "system", "tool"],
    }).notNull(),
    content: text("content").notNull(),
    model: text("model"),
    toolCalls: text("tool_calls", { mode: "json" }).$type<Record<string, unknown> | null>(),
    streamId: text("stream_id"),
    checkpoint: text("checkpoint", { mode: "json" }).$type<Record<string, unknown> | null>(),
    isComplete: integer("is_complete", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    tokensUsed: integer("tokens_used"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    conversationIdIdx: index("idx_messages_conversation_id").on(table.conversationId),
    createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
    streamIdIdx: index("idx_messages_stream_id").on(table.streamId),
  })
);

export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["workspace", "task", "specialist", "orchestrator", "system"],
    }).notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt"),
    config: text("config", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    workspaceIdIdx: index("idx_agents_workspace_id").on(table.workspaceId),
  })
);

export const agentMemory = sqliteTable(
  "agent_memory",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    embedding: blob("embedding", { mode: "buffer" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    agentKeyIdx: index("idx_agent_memory_agent_key").on(table.agentId, table.key),
  })
);

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type"),
    size: integer("size").default(0),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    workspacePathIdx: index("idx_files_workspace_path").on(
      table.workspaceId,
      table.path
    ),
    workspaceIdIdx: index("idx_files_workspace_id").on(table.workspaceId),
  })
);

export const providers = sqliteTable(
  "providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["openai", "anthropic", "gemini", "ollama", "custom"],
    }).notNull(),
    config: text("config", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    nameIdx: index("idx_providers_name").on(table.name),
  })
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("queued"),
    input: text("input", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    output: text("output", { mode: "json" }).$type<Record<string, unknown> | null>(),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    agentIdIdx: index("idx_jobs_agent_id").on(table.agentId),
    workspaceIdIdx: index("idx_jobs_workspace_id").on(table.workspaceId),
    statusIdx: index("idx_jobs_status").on(table.status),
  })
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Workspace = InferSelectModel<typeof workspaces>;
export type NewWorkspace = InferInsertModel<typeof workspaces>;

export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type Agent = InferSelectModel<typeof agents>;
export type NewAgent = InferInsertModel<typeof agents>;

export type AgentMemory = InferSelectModel<typeof agentMemory>;
export type NewAgentMemory = InferInsertModel<typeof agentMemory>;

export type File = InferSelectModel<typeof files>;
export type NewFile = InferInsertModel<typeof files>;

export type Provider = InferSelectModel<typeof providers>;
export type NewProvider = InferInsertModel<typeof providers>;

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;

export type Setting = InferSelectModel<typeof settings>;
export type NewSetting = InferInsertModel<typeof settings>;
