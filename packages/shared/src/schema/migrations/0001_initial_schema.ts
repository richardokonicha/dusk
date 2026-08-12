import Database from "better-sqlite3";

export const up = async (db: Database.Database) => {
  db.exec(`
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
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT
    )
  `);

  db.exec(`
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
    )
  `);

  db.exec(`
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
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      embedding BLOB,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(agent_id, key)
    )
  `);

  db.exec(`
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
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('openai', 'anthropic', 'gemini', 'ollama', 'custom')),
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.exec(`
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
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_agent_id ON jobs(agent_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON jobs(workspace_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)");
};

export const down = async (db: Database.Database) => {
  db.exec("DROP INDEX IF EXISTS idx_conversations_updated_at");
  db.exec("DROP INDEX IF EXISTS idx_messages_created_at");
  db.exec("DROP INDEX IF EXISTS idx_jobs_status");
  db.exec("DROP INDEX IF EXISTS idx_jobs_workspace_id");
  db.exec("DROP INDEX IF EXISTS idx_jobs_agent_id");
  db.exec("DROP INDEX IF EXISTS idx_files_path");
  db.exec("DROP INDEX IF EXISTS idx_files_workspace_id");
  db.exec("DROP INDEX IF EXISTS idx_agents_workspace_id");
  db.exec("DROP INDEX IF EXISTS idx_messages_conversation_id");
  db.exec("DROP INDEX IF EXISTS idx_conversations_workspace_id");
  db.exec("DROP TABLE IF EXISTS settings");
  db.exec("DROP TABLE IF EXISTS jobs");
  db.exec("DROP TABLE IF EXISTS providers");
  db.exec("DROP TABLE IF EXISTS files");
  db.exec("DROP TABLE IF EXISTS agent_memory");
  db.exec("DROP TABLE IF EXISTS agents");
  db.exec("DROP TABLE IF EXISTS messages");
  db.exec("DROP TABLE IF EXISTS conversations");
  db.exec("DROP TABLE IF EXISTS workspaces");
};
