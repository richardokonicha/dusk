export type WorkspaceId = string;
export type ConversationId = string;
export type MessageId = string;
export type AgentId = string;
export type FileId = string;
export type ProviderId = string;
export type JobId = string;
export type SettingKey = string;

export type AgentType = "workspace" | "task" | "specialist" | "orchestrator" | "system";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type DbProviderType = "openai" | "anthropic" | "gemini" | "ollama" | "custom";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  description: string | null;
  path: string;
  icon: string | null;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings: Record<string, unknown> | null;
}

export interface NewWorkspace {
  id?: WorkspaceId;
  name: string;
  description?: string | null;
  path: string;
  icon?: string | null;
  color?: string;
  isActive?: boolean;
  settings?: Record<string, unknown> | null;
}

export interface Conversation {
  id: ConversationId;
  workspaceId: WorkspaceId;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface NewConversation {
  id?: ConversationId;
  workspaceId: WorkspaceId;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  role: MessageRole;
  content: string;
  model: string | null;
  toolCalls: ToolCall[] | null;
  streamId: string | null;
  checkpoint: Record<string, unknown> | null;
  isComplete: boolean;
  createdAt: Date;
  tokensUsed: number | null;
  metadata: Record<string, unknown> | null;
}

export interface NewMessage {
  id?: MessageId;
  conversationId: ConversationId;
  role: MessageRole;
  content: string;
  model?: string | null;
  toolCalls?: ToolCall[] | null;
  streamId?: string | null;
  checkpoint?: Record<string, unknown> | null;
  isComplete?: boolean;
  tokensUsed?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Agent {
  id: AgentId;
  workspaceId: WorkspaceId | null;
  name: string;
  type: AgentType;
  description: string | null;
  systemPrompt: string | null;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAgent {
  id?: AgentId;
  workspaceId?: WorkspaceId | null;
  name: string;
  type: AgentType;
  description?: string | null;
  systemPrompt?: string | null;
  config: AgentConfig;
}

export interface AgentConfig {
  model?: string;
  tools: string[];
  permissions: AgentPermissions;
  memory: MemoryConfig;
  maxIterations?: number;
  temperature?: number;
}

export interface AgentPermissions {
  filesystem: "read" | "read-write" | "none";
  web: boolean;
  codeExecution: boolean;
  mcpServers: string[];
}

export interface MemoryConfig {
  conversation: boolean;
  workspaceArtifacts: boolean;
  longTerm: boolean;
  maxEntries?: number;
}

export interface AgentMemory {
  id: string;
  agentId: AgentId;
  key: string;
  value: string;
  embedding: ArrayBuffer | null;
  createdAt: Date;
}

export interface NewAgentMemory {
  id?: string;
  agentId: AgentId;
  key: string;
  value: string;
  embedding?: ArrayBuffer | null;
}

export interface File {
  id: FileId;
  workspaceId: WorkspaceId;
  path: string;
  name: string;
  mimeType: string | null;
  size: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface NewFile {
  id?: FileId;
  workspaceId: WorkspaceId;
  path: string;
  name: string;
  mimeType?: string | null;
  size?: number;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Provider {
  id: ProviderId;
  name: string;
  type: DbProviderType;
  config: DbProviderConfig;
  isActive: boolean;
  createdAt: Date;
}

export interface NewProvider {
  id?: ProviderId;
  name: string;
  type: DbProviderType;
  config: DbProviderConfig;
  isActive?: boolean;
}

export interface DbProviderConfig {
  endpoint?: string;
  apiKeyRef?: string;
  models?: string[];
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  headers?: Record<string, string>;
}

export interface Job {
  id: JobId;
  agentId: AgentId;
  workspaceId: WorkspaceId;
  status: JobStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface NewJob {
  id?: JobId;
  agentId: AgentId;
  workspaceId: WorkspaceId;
  input: Record<string, unknown>;
}

export interface Setting {
  key: SettingKey;
  value: string;
  updatedAt: Date;
}

export interface NewSetting {
  key: SettingKey;
  value: string;
}

export interface DrizzleDBSchema {
  workspaces: unknown
  conversations: unknown
  messages: unknown
  agents: unknown
  agentMemory: unknown
  files: unknown
  providers: unknown
  jobs: unknown
  settings: unknown
}
