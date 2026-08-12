CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT DEFAULT '#6366F1',
  is_active INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  settings TEXT
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  model TEXT,
  tool_calls TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  tokens_used INTEGER,
  metadata TEXT
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('workspace', 'task', 'specialist', 'orchestrator', 'system')),
  description TEXT,
  system_prompt TEXT,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS agent_memory (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  embedding BLOB,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(agent_id, key)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT,
  UNIQUE(workspace_id, path)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('openai', 'anthropic', 'gemini', 'ollama', 'custom')),
  config TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input TEXT NOT NULL,
  output TEXT,
  error TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_jobs_agent_id ON jobs(agent_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON jobs(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
