# Dusk — System Architecture

## 1. Electron Architecture

### 1.1 Process Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Service Container (IoC)                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │  DB Service │  │ Provider    │  │ Agent        │ │  │
│  │  │             │  │ Service     │  │ Runtime      │ │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘ │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │  File       │  │ IPC         │  │ Job Queue    │ │  │
│  │  │  Service    │  │ Server      │  │              │ │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ IPC │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Electron Renderer Process                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Vite                         │  │
│  │                                                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │  Workspace │  │  Chat UI   │  │  Agent UI      │  │  │
│  │  │  Shell     │  │            │  │                │  │  │
│  │  └────────────┘  └────────────┘  └────────────────┘  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │  File      │  │  Settings  │  │  Theme Engine  │  │  │
│  │  │  Browser   │  │            │  │                │  │  │
│  │  └────────────┘  └────────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 IPC Contract

All IPC is type-safe with request/response pattern plus event streaming.

```typescript
// IPC Channel Registry
export const IPC_CHANNELS = {
  // Workspace
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_GET: 'workspace:get',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_UPDATE: 'workspace:update',
  
  // Conversations
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_GET: 'conversation:get',
  CONVERSATION_DELETE: 'conversation:delete',
  
  // Messages
  MESSAGE_SEND: 'message:send',
  MESSAGE_STREAM: 'message:stream', // Event stream
  MESSAGE_HISTORY: 'message:history',
  
  // Agents
  AGENT_LIST: 'agent:list',
  AGENT_CREATE: 'agent:create',
  AGENT_GET: 'agent:get',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_INVOKE: 'agent:invoke',
  AGENT_STOP: 'agent:stop',
  
  // Files
  FILE_LIST: 'file:list',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_WATCH: 'file:watch', // Event stream
  
  // Providers
  PROVIDER_LIST: 'provider:list',
  PROVIDER_ADD: 'provider:add',
  PROVIDER_TEST: 'provider:test',
  PROVIDER_GET_MODELS: 'provider:get-models',
  
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  
  // System
  SYSTEM_INFO: 'system:info',
  SYSTEM_OPEN_PATH: 'system:open-path',
} as const;

type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

### 1.3 Service Container

```typescript
interface ServiceContainer {
  db: DatabaseService;
  provider: ProviderService;
  agent: AgentRuntimeService;
  file: FileService;
  jobQueue: JobQueueService;
  settings: SettingsService;
  eventBus: EventBus;
}

class DuskContainer implements ServiceContainer {
  private services = new Map<string, any>();
  
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory());
  }
  
  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) throw new Error(`Service not found: ${key}`);
    return service;
  }
}
```

---

## 2. Data Model

### 2.1 SQLite Schema

```sql
-- Workspaces (top-level organization)
CREATE TABLE workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  path        TEXT NOT NULL UNIQUE,  -- filesystem path
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  settings    TEXT  -- JSON blob
);

-- Conversations (within a workspace)
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title       TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata    TEXT  -- JSON: model, agent, tags
);

-- Messages
CREATE TABLE messages (
  id          TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,  -- 'user' | 'assistant' | 'system' | 'tool'
  content     TEXT NOT NULL,  -- markdown/text
  model       TEXT,           -- provider/model used
  tool_calls  TEXT,           -- JSON array of tool calls
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  tokens_used INTEGER,
  metadata    TEXT
);

-- Agents
CREATE TABLE agents (
  id          TEXT PRIMARY KEY,
  workspace_id TEXT,           -- NULL = global/shared agent
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,   -- 'workspace' | 'task' | 'specialist' | 'orchestrator' | 'system'
  description TEXT,
  system_prompt TEXT,
  config      TEXT NOT NULL,   -- JSON: tools, permissions, model, memory settings
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Agent memory (long-term, per agent)
CREATE TABLE agent_memory (
  id          TEXT PRIMARY KEY,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  embedding   BLOB,            -- optional vector embedding
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(agent_id, key)
);

-- Files (workspace artifacts)
CREATE TABLE files (
  id          TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,   -- relative to workspace
  name        TEXT NOT NULL,
  mime_type   TEXT,
  size        INTEGER,
  created_by  TEXT,            -- agent_id or user
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata    TEXT,            -- JSON
  UNIQUE(workspace_id, path)
);

-- Providers
CREATE TABLE providers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,   -- 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom'
  config      TEXT NOT NULL,   -- JSON: endpoint, key ref, models, etc.
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Jobs (task agent queue)
CREATE TABLE jobs (
  id          TEXT PRIMARY KEY,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'queued',  -- 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  input       TEXT NOT NULL,   -- JSON
  output      TEXT,            -- JSON
  error       TEXT,
  started_at  INTEGER,
  completed_at INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Settings (key-value)
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_jobs_agent ON jobs(agent_id);
CREATE INDEX idx_jobs_workspace ON jobs(workspace_id);
```

### 2.2 Repository Pattern

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: T): Promise<T[]>;
  create(data: Omit<T, 'id' | 'created_at'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class WorkspaceRepository implements Repository<Workspace> {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<Workspace | null> {
    const row = await this.db.get('SELECT * FROM workspaces WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }
  
  async findByPath(path: string): Promise<Workspace | null> {
    const row = await this.db.get('SELECT * FROM workspaces WHERE path = ?', [path]);
    return row ? this.mapRow(row) : null;
  }
  
  async create(data: CreateWorkspace): Promise<Workspace> {
    const id = crypto.randomUUID();
    await this.db.run(
      'INSERT INTO workspaces (id, name, description, path) VALUES (?, ?, ?, ?)',
      [id, data.name, data.description, data.path]
    );
    return this.findById(id)!;
  }
  
  // ... other methods
}
```

---

## 3. Provider System

### 3.1 Provider Interface

```typescript
interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  
  // Connection
  testConnection(): Promise<ConnectionResult>;
  
  // Models
  listModels(): Promise<ModelInfo[]>;
  
  // Chat
  streamChat(params: ChatParams): AsyncIterable<StreamChunk>;
  chat(params: ChatParams): Promise<ChatResult>;
  
  // Tools
  supportsTools(): boolean;
  toolCall(params: ToolCallParams): Promise<ToolCallResult>;
  
  // Embeddings (optional)
  embed?(text: string): Promise<number[]>;
}

interface ChatParams {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; name: string };
  stream?: boolean;
}

interface StreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  usage?: TokenUsage;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';
```

### 3.2 Built-in Providers

| Provider | Type | Streaming | Tools | Notes |
|----------|------|-----------|-------|-------|
| OpenAI | `openai` | ✅ | ✅ | GPT-4o, GPT-4o-mini, etc. |
| Anthropic | `anthropic` | ✅ | ✅ | Claude 4 family |
| Google | `gemini` | ✅ | ✅ | Gemini 2.5 Pro/Flash |
| Ollama | `ollama` | ✅ | ✅ | Local models |
| Custom | `custom` | ✅ | ✅ | OpenAI-compatible endpoint |

### 3.3 Provider Service

```typescript
class ProviderService {
  private providers = new Map<string, LLMProvider>();
  private defaultProvider: string;
  
  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }
  
  get(id: string): LLMProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Provider not found: ${id}`);
    return provider;
  }
  
  async streamChat(params: ChatParams): AsyncIterable<StreamChunk> {
    const provider = this.get(params.providerId || this.defaultProvider);
    return provider.streamChat(params);
  }
  
  async testConnection(id: string): Promise<ConnectionResult> {
    return this.get(id).testConnection();
  }
}
```

---

## 4. Agent Runtime

### 4.1 Agent State Machine

```
      ┌─────────┐
      │  IDLE   │ ◄─────────────┐
      └────┬────┘                │
           │ invoke()             │ complete()
           ▼                      │
      ┌─────────┐     error/stop  │
      │ ACTIVE  │ ────────────────┘
      └────┬────┘
           │ tool call needed
           ▼
      ┌─────────┐
      │ WORKING │
      └────┬────┘
           │ needs input
           ▼
      ┌───────────┐
      │ AWAITING  │
      └─────┬─────┘
            │ input received
            ▼
      ┌─────────┐
      │ ACTIVE  │ (loop back)
      └─────────┘
```

### 4.2 Agent Runtime Interface

```typescript
interface AgentRuntime {
  // Lifecycle
  initialize(agent: AgentConfig): Promise<void>;
  invoke(input: AgentInput): AsyncIterable<AgentEvent>;
  stop(agentId: string): Promise<void>;
  
  // Memory
  getMemory(agentId: string, key: string): Promise<any>;
  setMemory(agentId: string, key: string, value: any): Promise<void>;
  
  // Tools
  registerTool(tool: Tool): void;
  executeTool(toolCall: ToolCall): Promise<ToolResult>;
  
  // Events
  onEvent(agentId: string, handler: (event: AgentEvent) => void): void;
}

interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'state_change' | 'error' | 'done';
  data?: any;
  timestamp: number;
}
```

### 4.3 Tool Execution

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

interface ToolContext {
  workspaceId: string;
  agentId: string;
  fileService: FileService;
  providerService: ProviderService;
}

class ToolExecutor {
  private tools = new Map<string, Tool>();
  private permissions = new Map<string, ToolPermission>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) throw new Error(`Tool not found: ${toolCall.name}`);
    
    // Permission check
    const allowed = this.checkPermission(context.agentId, tool.name);
    if (!allowed) throw new Error(`Permission denied: ${tool.name}`);
    
    // Execute
    return tool.execute(toolCall.arguments, context);
  }
  
  private checkPermission(agentId: string, toolName: string): boolean {
    // Check agent's tool permissions
    return true; // Implement based on agent config
  }
}
```

---

## 5. File System Service

### 5.1 Workspace Structure

```
<workspace-path>/
├── .dusk/
│   ├── metadata.json          -- workspace config
│   ├── settings.json          -- workspace-specific settings
│   └── .gitignore             -- ignore patterns
├── conversations/             -- chat histories (JSONL)
├── artifacts/                 -- agent outputs
│   ├── <agent-id>/
│   │   ├── <date>/
│   │   │   ├── report.md
│   │   │   └── data.csv
│   │   └── ...
│   └── ...
├── files/                     -- user-uploaded files
└── projects/                  -- user project files
```

### 5.2 File Service Interface

```typescript
interface FileService {
  // Workspace files
  listWorkspaceFiles(workspaceId: string): Promise<FileInfo[]>;
  readFile(workspaceId: string, path: string): Promise<Buffer>;
  writeFile(workspaceId: string, path: string, content: Buffer): Promise<void>;
  deleteFile(workspaceId: string, path: string): Promise<void>;
  
  // Artifacts
  saveArtifact(workspaceId: string, agentId: string, artifact: Artifact): Promise<string>;
  listArtifacts(workspaceId: string, agentId?: string): Promise<Artifact[]>;
  
  // Import/Export
  exportWorkspace(workspaceId: string): Promise<Buffer>;
  importWorkspace(data: Buffer): Promise<Workspace>;
  
  // Watchers
  watchWorkspace(workspaceId: string): AsyncIterable<FileEvent>;
}
```

---

## 6. Type Definitions

```typescript
// Core types
type WorkspaceID = string;
type ConversationID = string;
type MessageID = string;
type AgentID = string;
type FileID = string;
type ProviderID = string;
type JobID = string;

interface Workspace {
  id: WorkspaceID;
  name: string;
  description?: string;
  path: string;
  createdAt: number;
  updatedAt: number;
  settings: WorkspaceSettings;
}

interface Conversation {
  id: ConversationID;
  workspaceId: WorkspaceID;
  title: string;
  createdAt: number;
  updatedAt: number;
  metadata: ConversationMetadata;
}

interface Message {
  id: MessageID;
  conversationId: ConversationID;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  model?: string;
  toolCalls?: ToolCall[];
  createdAt: number;
  tokensUsed?: number;
  metadata: MessageMetadata;
}

interface AgentConfig {
  id: AgentID;
  workspaceId?: WorkspaceID;
  name: string;
  type: AgentType;
  description?: string;
  systemPrompt: string;
  config: AgentRuntimeConfig;
  createdAt: number;
  updatedAt: number;
}

type AgentType = 'workspace' | 'task' | 'specialist' | 'orchestrator' | 'system';

interface AgentRuntimeConfig {
  model?: string;  // provider/model override
  tools: string[];  // allowed tool names
  permissions: AgentPermissions;
  memory: MemoryConfig;
  maxIterations?: number;
  temperature?: number;
}

interface AgentPermissions {
  filesystem: 'read' | 'read-write' | 'none';
  web: boolean;
  codeExecution: boolean;
  mcpServers: string[];
}

interface MemoryConfig {
  conversation: boolean;
  workspaceArtifacts: boolean;
  longTerm: boolean;
  maxEntries?: number;
}

interface FileInfo {
  id: FileID;
  workspaceId: WorkspaceID;
  path: string;
  name: string;
  mimeType?: string;
  size: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
}

interface Artifact {
  id: string;
  agentId: AgentID;
  name: string;
  path: string;
  mimeType: string;
  content?: Buffer;
  metadata: Record<string, any>;
  createdAt: number;
}

interface ProviderConfig {
  id: ProviderID;
  name: string;
  type: ProviderType;
  config: ProviderRuntimeConfig;
  isActive: boolean;
  createdAt: number;
}

interface ProviderRuntimeConfig {
  endpoint?: string;
  apiKeyRef?: string;  // reference to secure storage
  models?: string[];
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
}

interface Job {
  id: JobID;
  agentId: AgentID;
  workspaceId: WorkspaceID;
  status: JobStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
}

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
```

---

## 7. Event Bus

```typescript
interface EventBus {
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;
}

// Events
type DuskEvent = 
  | { type: 'workspace:created'; workspace: Workspace }
  | { type: 'conversation:created'; conversation: Conversation }
  | { type: 'message:created'; message: Message }
  | { type: 'agent:state_changed'; agentId: string; state: AgentState }
  | { type: 'agent:tool_executed'; agentId: string; toolCall: ToolCall; result: ToolResult }
  | { type: 'job:status_changed'; job: Job }
  | { type: 'file:changed'; file: FileInfo }
  | { type: 'provider:connected'; providerId: string }
  | { type: 'provider:disconnected'; providerId: string };
```

---

## 8. Security Considerations

### 8.1 API Key Storage

```typescript
interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// Use system keychain:
// - macOS: Keychain
// - Windows: Credential Manager
// - Linux: libsecret / keyctl
```

### 8.2 Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self' https:; 
               img-src 'self' data: https:;">
```

### 8.3 IPC Security

- All IPC handlers validate input against schemas
- Renderer never has direct filesystem access
- Provider keys never exposed to renderer
- Tool execution sandboxed with explicit permission checks

---

*This architecture is designed for implementation. All interfaces are concrete enough for immediate development.*
