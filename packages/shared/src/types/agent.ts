export type AgentType = 'workspace' | 'task' | 'specialist' | 'orchestrator' | 'system'

export interface AgentConfig {
  id: string
  type: AgentType
  name: string
  description?: string
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: string[]
  permissions?: AgentPermissions
  memory?: MemoryConfig
}

export interface AgentInstance {
  id: string
  config: AgentConfig
  state: AgentState
  invoke(input: AgentInput): Promise<AgentResult>
  stop(): void
  getState(): AgentState
  invokeStream(input: AgentInput): AsyncIterable<AgentEvent>
}

export interface AgentRuntimeConfig {
  defaultAgentType: AgentType
  maxConcurrentAgents: number
  defaultMemoryConfig: MemoryConfig
  toolTimeoutMs: number
  maxToolIterations: number
}

export interface AgentPermissions {
  allowFileRead: boolean
  allowFileWrite: boolean
  allowedPaths?: string[]
  blockedPaths?: string[]
  allowNetwork: boolean
  maxRequestsPerMinute: number
}

export interface MemoryConfig {
  shortTermMaxMessages: number
  longTermEnabled: boolean
  longTermDbPath?: string
}

export type AgentState = 'idle' | 'active' | 'working' | 'completed' | 'failed'

export interface AgentInput {
  message: string
  conversationId?: string
  artifacts?: Artifact[]
  metadata?: Record<string, unknown>
}

export interface Artifact {
  id: string
  type: 'file' | 'image' | 'code' | 'data'
  name: string
  content?: string
  path?: string
  mimeType?: string
  metadata?: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  name: string
  result: unknown
  error?: string
  durationMs: number
}

export type AgentEvent =
  | { type: 'text'; content: string; streamId?: string }
  | { type: 'tool_call'; toolCall: ToolCall; streamId?: string }
  | { type: 'tool_result'; toolResult: ToolResult; streamId?: string }
  | { type: 'state_change'; state: AgentState; streamId?: string }
  | { type: 'error'; error: Error; streamId?: string }
  | { type: 'done'; result: AgentResult; streamId?: string }
  | { type: 'artifact'; artifact: Artifact; streamId?: string }

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  timestamp: number
}

export interface AgentResult {
  conversationId: string
  messages: AgentMessage[]
  artifacts: Artifact[]
  usage?: { promptTokens: number; completionTokens: number }
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string
}

export interface LLMStreamEvent {
  type: 'text_delta' | 'tool_call' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  usage?: { promptTokens: number; completionTokens: number }
}

export interface LLMClient {
  stream(
    messages: LLMMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<LLMStreamEvent>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolExecutionContext {
  agentId: string
  conversationId: string
  permissions: AgentPermissions
  workingDirectory: string
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult>
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface MemoryEntry {
  key: string
  value: string
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
}
