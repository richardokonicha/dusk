export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "assistant" | "system";

export type MessageBlockType = "text" | "tool" | "error" | "artifact";

export interface MessageBlock {
  id: string;
  messageId: string;
  type: MessageBlockType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  blocks: MessageBlock[];
  createdAt: string;
}

export type AgentStatus = "idle" | "active" | "working" | "error";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  lastActivity: string | null;
}

export interface ToolResult {
  id: string;
  name: string;
  status: "success" | "error";
  input: unknown;
  output: unknown;
  durationMs: number;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  language?: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
  isLoading: boolean;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
}
