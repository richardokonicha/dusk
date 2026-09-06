# Dusk — Agent System Design

## 1. Agent Data Model

### 1.1 Agent Config Schema

```typescript
interface AgentConfig {
  id: string;
  workspaceId?: string;           // NULL = global/shared
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
  model?: string;                 // provider/model override
  temperature?: number;
  maxTokens?: number;
  tools: string[];                // allowed tool names
  permissions: AgentPermissions;
  memory: MemoryConfig;
  maxIterations?: number;         // for task agents
  retryPolicy?: RetryPolicy;
}

interface AgentPermissions {
  filesystem: 'read' | 'read-write' | 'none';
  web: boolean;
  codeExecution: boolean;
  mcpServers: string[];
  maxFileSize?: number;           // bytes
  allowedPaths?: string[];        // glob patterns
}

interface MemoryConfig {
  conversation: boolean;          // short-term: current session
  workspaceArtifacts: boolean;    // long-term: workspace files
  longTerm: boolean;              // persistent key-value memory
  maxEntries?: number;
  ttl?: number;                   // seconds
}

interface RetryPolicy {
  maxRetries: number;
  backoff: 'linear' | 'exponential';
  retryableErrors: string[];
}
```

### 1.2 Agent State Machine

```
States:
  IDLE          → agent exists, no active work
  INITIALIZING  → loading config, connecting to provider
  ACTIVE        → responding in chat/streaming
  WORKING       → executing tools, multi-step task
  AWAITING_INPUT → needs user decision
  COMPLETED     → job done, artifacts delivered
  FAILED        → error state, retry available
  STOPPED       → manually stopped

Transitions:
  IDLE → INITIALIZING (on invoke)
  INITIALIZING → ACTIVE (ready)
  INITIALIZING → FAILED (error)
  ACTIVE → WORKING (tool call)
  ACTIVE → AWAITING_INPUT (needs decision)
  ACTIVE → COMPLETED (done)
  ACTIVE → FAILED (error)
  WORKING → ACTIVE (tool done)
  WORKING → AWAITING_INPUT (needs decision)
  WORKING → FAILED (error)
  AWAITING_INPUT → ACTIVE (input received)
  AWAITING_INPUT → FAILED (timeout)
  ANY → STOPPED (manual stop)
  COMPLETED → IDLE (reset)
  FAILED → IDLE (retry)
```

---

## 2. Agent Runtime

### 2.1 Runtime Interface

```typescript
interface AgentRuntime {
  // Lifecycle
  initialize(agent: AgentConfig): Promise<void>;
  invoke(agentId: string, input: AgentInput): AsyncIterable<AgentEvent>;
  stop(agentId: string): Promise<void>;
  
  // Memory
  getMemory(agentId: string, key: string): Promise<any>;
  setMemory(agentId: string, key: string, value: any): Promise<void>;
  clearMemory(agentId: string): Promise<void>;
  
  // Tools
  registerTool(tool: Tool): void;
  getAvailableTools(agentId: string): Tool[];
  
  // Events
  onEvent(agentId: string, handler: (event: AgentEvent) => void): () => void;
}

interface AgentInput {
  type: 'chat' | 'task' | 'tool_result';
  content: string;
  workspaceId: string;
  conversationId?: string;
  metadata?: Record<string, any>;
}

interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'state_change' | 'error' | 'done' | 'artifact_created';
  data?: any;
  timestamp: number;
}
```

### 2.2 Agent Instance

```typescript
class AgentInstance {
  private messages: Message[] = [];
  private memory: Map<string, any> = new Map();
  private isRunning = false;
  private abortController: AbortController;
  private eventHandlers = new Set<(event: AgentEvent) => void>();
  
  constructor(
    private config: AgentConfig,
    private provider: ProviderService,
    private toolExecutor: ToolExecutor,
    private eventBus: EventBus
  ) {
    this.abortController = new AbortController();
  }
  
  async *run(input: AgentInput): AsyncIterable<AgentEvent> {
    this.isRunning = true;
    this.emit({ type: 'state_change', data: { state: 'initializing' } });
    
    // Load memory
    if (this.config.config.memory.conversation) {
      const history = await this.loadConversationHistory(input.conversationId);
      this.messages = history;
    }
    
    // Add user message
    this.messages.push({
      role: 'user',
      content: input.content,
    });
    
    this.emit({ type: 'state_change', data: { state: 'active' } });
    
    let iteration = 0;
    const maxIterations = this.config.config.maxIterations || 10;
    
    while (this.isRunning && iteration < maxIterations) {
      iteration++;
      
      try {
        // Build context with memory
        const contextMessages = await this.buildContext();
        
        // Call LLM
        const response = await this.provider.streamChat({
          messages: contextMessages,
          model: this.config.config.model || 'default',
          temperature: this.config.config.temperature,
          maxTokens: this.config.config.maxTokens,
          tools: this.toolExecutor.getToolDefinitions(this.config.config.tools),
          stream: true,
        });
        
        let fullContent = '';
        const toolCalls: ToolCall[] = [];
        
        for await (const chunk of response) {
          if (chunk.type === 'text') {
            fullContent += chunk.content;
            this.emit({ type: 'text', data: { content: chunk.content } });
          } else if (chunk.type === 'tool_call') {
            toolCalls.push(chunk.toolCall);
          }
        }
        
        // Save assistant message
        const assistantMessage: Message = {
          role: 'assistant',
          content: fullContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
        this.messages.push(assistantMessage);
        
        // Execute tools
        if (toolCalls.length > 0) {
          this.emit({ type: 'state_change', data: { state: 'working' } });
          
          for (const toolCall of toolCalls) {
            this.emit({ type: 'tool_call', data: toolCall });
            
            try {
              const result = await this.toolExecutor.execute(toolCall, {
                workspaceId: input.workspaceId,
                agentId: this.config.id,
                fileService: this.file,
                providerService: this.provider,
              });
              
              this.messages.push({
                role: 'tool',
                content: JSON.stringify(result),
              });
              
              this.emit({ type: 'tool_result', data: { toolCall, result } });
              
              // Save artifact if tool produces one
              if (result.artifact) {
                await this.saveArtifact(input.workspaceId, result.artifact);
                this.emit({ type: 'artifact_created', data: result.artifact });
              }
            } catch (error) {
              const errorMessage = `Tool error (${toolCall.name}): ${error.message}`;
              this.messages.push({
                role: 'system',
                content: errorMessage,
              });
              this.emit({ type: 'error', data: { error: errorMessage } });
            }
          }
          
          this.emit({ type: 'state_change', data: { state: 'active' } });
        } else {
          // No tool calls, conversation complete
          break;
        }
      } catch (error) {
        this.emit({ type: 'error', data: { error: error.message } });
        this.emit({ type: 'state_change', data: { state: 'failed' } });
        break;
      }
    }
    
    // Save conversation history
    if (this.config.config.memory.conversation && input.conversationId) {
      await this.saveConversationHistory(input.conversationId, this.messages);
    }
    
    // Save long-term memory
    if (this.config.config.memory.longTerm) {
      await this.saveLongTermMemory();
    }
    
    this.emit({ type: 'state_change', data: { state: 'completed' } });
    this.emit({ type: 'done' });
    this.isRunning = false;
  }
  
  private async buildContext(): Promise<Message[]> {
    const context: Message[] = [];
    
    // System prompt
    if (this.config.systemPrompt) {
      context.push({
        role: 'system',
        content: this.config.systemPrompt,
      });
    }
    
    // Inject long-term memory if enabled
    if (this.config.config.memory.longTerm) {
      const memories = await this.loadLongTermMemory();
      if (memories.length > 0) {
        context.push({
          role: 'system',
          content: `Relevant context:\n${memories.join('\n')}`,
        });
      }
    }
    
    // Inject workspace artifacts if enabled
    if (this.config.config.memory.workspaceArtifacts) {
      const artifacts = await this.loadRecentArtifacts();
      if (artifacts.length > 0) {
        context.push({
          role: 'system',
          content: `Recent workspace artifacts:\n${artifacts.map(a => `- ${a.name}: ${a.summary}`).join('\n')}`,
        });
      }
    }
    
    // Conversation history
    context.push(...this.messages);
    
    return context;
  }
  
  private emit(event: AgentEvent) {
    event.timestamp = Date.now();
    this.eventHandlers.forEach(handler => handler(event));
    this.eventBus.emit('agent:event', { agentId: this.config.id, event });
  }
  
  onEvent(handler: (event: AgentEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    this.abortController.abort();
    this.emit({ type: 'state_change', data: { state: 'stopped' } });
  }
}
```

---

## 3. Tool System

### 3.1 Tool Interface

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

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  artifact?: Artifact;
}
```

### 3.2 Built-in Tools

```typescript
// Read File Tool
class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read the contents of a file in the workspace';
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file' },
    },
    required: ['path'],
  };
  
  constructor(private fileService: FileService) {}
  
  async execute(params: { path: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const content = await this.fileService.readFile(context.workspaceId, params.path);
      return { success: true, data: content.toString('utf-8') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Write File Tool
class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file in the workspace';
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  };
  
  constructor(private fileService: FileService) {}
  
  async execute(params: { path: string; content: string }, context: ToolContext): Promise<ToolResult> {
    try {
      await this.fileService.writeFile(context.workspaceId, params.path, Buffer.from(params.content));
      return { success: true, data: { path: params.path } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// List Files Tool
class ListFilesTool implements Tool {
  name = 'list_files';
  description = 'List files in a workspace directory';
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative directory path (default: root)' },
      pattern: { type: 'string', description: 'Glob pattern to filter' },
    },
    required: [],
  };
  
  constructor(private fileService: FileService) {}
  
  async execute(params: { path?: string; pattern?: string }, context: ToolContext): Promise<ToolResult> {
    const files = await this.fileService.listFiles(context.workspaceId);
    return { success: true, data: files };
  }
}
```

### 3.3 Tool Executor

```typescript
class ToolExecutor {
  private tools = new Map<string, Tool>();
  private permissions = new Map<string, ToolPermission>();
  
  constructor(private fileService: FileService) {
    this.registerDefaultTools();
  }
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  getToolDefinitions(allowedTools: string[]): any[] {
    return Array.from(this.tools.values())
      .filter(tool => allowedTools.includes(tool.name))
      .map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
  }
  
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      return { success: false, error: `Tool not found: ${toolCall.name}` };
    }
    
    // Permission check
    const allowed = this.checkPermission(context.agentId, tool.name);
    if (!allowed) {
      return { success: false, error: `Permission denied: ${toolCall.name}` };
    }
    
    // Execute
    return tool.execute(toolCall.arguments, context);
  }
  
  private checkPermission(agentId: string, toolName: string): boolean {
    // Check agent's tool permissions from config
    // Implement based on agent config
    return true;
  }
  
  private registerDefaultTools() {
    this.register(new ReadFileTool(this.fileService));
    this.register(new WriteFileTool(this.fileService));
    this.register(new ListFilesTool(this.fileService));
    // Add more tools
  }
}
```

---

## 4. Multi-Agent Orchestration

### 4.1 Orchestrator Agent

```typescript
class OrchestratorAgent {
  private specialists = new Map<string, AgentConfig>();
  
  constructor(private agentRuntime: AgentRuntime) {}
  
  registerSpecialist(agent: AgentConfig) {
    this.specialists.set(agent.id, agent);
  }
  
  async route(input: AgentInput): Promise<AsyncIterable<AgentEvent>> {
    // Analyze input to determine which specialist to use
    const specialist = this.selectSpecialist(input);
    
    if (specialist) {
      return this.agentRuntime.invoke(specialist.id, input);
    }
    
    // Default to workspace agent
    return this.agentRuntime.invoke('workspace-agent', input);
  }
  
  private selectSpecialist(input: AgentInput): AgentConfig | null {
    // Simple keyword matching (upgrade to LLM-based routing)
    const keywords = {
      'code': 'coder',
      'review': 'reviewer',
      'write': 'writer',
      'analyze': 'analyst',
      'research': 'researcher',
      'deploy': 'devops',
    };
    
    for (const [keyword, agentId] of Object.entries(keywords)) {
      if (input.content.toLowerCase().includes(keyword)) {
        return this.specialists.get(agentId) || null;
      }
    }
    
    return null;
  }
}
```

### 4.2 Multi-Agent Workflow

```typescript
interface WorkflowStep {
  agentId: string;
  input: (previousOutput: any) => AgentInput;
  outputKey: string;
}

class WorkflowExecutor {
  constructor(private agentRuntime: AgentRuntime) {}
  
  async execute(workflow: WorkflowDefinition, initialInput: AgentInput): Promise<WorkflowResult> {
    const results: Record<string, any> = {};
    
    for (const step of workflow.steps) {
      const input = step.input(results[workflow.steps[workflow.steps.indexOf(step) - 1]?.outputKey || '']);
      
      const events = await this.agentRuntime.invoke(step.agentId, input);
      
      let output: any = null;
      for await (const event of events) {
        if (event.type === 'done') {
          output = event.data;
        }
      }
      
      results[step.outputKey] = output;
    }
    
    return { results, completedAt: Date.now() };
  }
}
```

---

## 5. Memory System

### 5.1 Memory Architecture

```
┌─────────────────────────────────────────────┐
│           Agent Memory Layers                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Short-term  │  │  Long-term Memory   │  │
│  │ Memory      │  │  (Persistent)       │  │
│  │             │  │                     │  │
│  │ - Current   │  │  - Key facts        │  │
│  │   session   │  │  - User prefs       │  │
│  │ - Last N    │  │  - Workspace notes  │  │
│  │   messages  │  │  - Artifact refs    │  │
│  │ - Context   │  │  - Learned patterns │  │
│  │   window    │  │                     │  │
│  └─────────────┘  └─────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Workspace Artifacts (External)     │    │
│  │  - Files agents have created        │    │
│  │  - Reference documents              │    │
│  │  - Code repositories                │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### 5.2 Memory Storage

```typescript
interface MemoryStore {
  // Short-term (in-memory, cleared between sessions)
  getConversationHistory(conversationId: string): Promise<Message[]>;
  saveConversationHistory(conversationId: string, messages: Message[]): Promise<void>;
  
  // Long-term (persistent in SQLite)
  getMemory(agentId: string, key: string): Promise<any>;
  setMemory(agentId: string, key: string, value: any): Promise<void>;
  listMemories(agentId: string): Promise<MemoryEntry[]>;
  deleteMemory(agentId: string, key: string): Promise<void>;
  
  // Semantic search (optional, requires embeddings)
  searchMemories(agentId: string, query: string, limit: number): Promise<MemoryEntry[]>;
}

class SQLiteMemoryStore implements MemoryStore {
  constructor(private db: Database) {}
  
  async getMemory(agentId: string, key: string): Promise<any> {
    const row = this.db.get(
      'SELECT value FROM agent_memory WHERE agent_id = ? AND key = ?',
      [agentId, key]
    );
    return row ? JSON.parse(row.value) : null;
  }
  
  async setMemory(agentId: string, key: string, value: any): Promise<void> {
    this.db.run(
      'INSERT OR REPLACE INTO agent_memory (agent_id, key, value) VALUES (?, ?, ?)',
      [agentId, key, JSON.stringify(value)]
    );
  }
}
```

---

## 6. Agent Configuration Format

### 6.1 YAML Schema

```yaml
# agents/coder.yaml
name: Coder
type: specialist
description: Expert software developer. Writes clean, well-documented code.

systemPrompt: |
  You are an expert software developer specializing in clean, maintainable code.
  You follow best practices, write tests, and document your work.
  You produce artifacts (code files) that can be used directly.

config:
  model: openai/gpt-4o
  temperature: 0.2
  maxTokens: 4096
  
  tools:
    - read_file
    - write_file
    - list_files
    - code_execution
  
  permissions:
    filesystem: read-write
    web: false
    codeExecution: true
    mcpServers: []
    allowedPaths:
      - "src/**"
      - "tests/**"
  
  memory:
    conversation: true
    workspaceArtifacts: true
    longTerm: true
    maxEntries: 100
```

### 6.2 JSON Schema

```json
{
  "name": "Coder",
  "type": "specialist",
  "description": "Expert software developer",
  "systemPrompt": "You are an expert software developer...",
  "config": {
    "model": "openai/gpt-4o",
    "temperature": 0.2,
    "maxTokens": 4096,
    "tools": ["read_file", "write_file", "list_files", "code_execution"],
    "permissions": {
      "filesystem": "read-write",
      "web": false,
      "codeExecution": true,
      "mcpServers": [],
      "allowedPaths": ["src/**", "tests/**"]
    },
    "memory": {
      "conversation": true,
      "workspaceArtifacts": true,
      "longTerm": true,
      "maxEntries": 100
    }
  }
}
```

---

## 7. Implementation Phases

### Phase 1 (MVP)
- Workspace Agent (default, persistent)
- Basic tool use (read_file, write_file, list_files)
- Artifact output (save agent responses as workspace files)
- Simple task spawning (chat-triggered)
- Agent config via UI (no YAML yet)

### Phase 2 (Fugoku on-ramp)
- Task Agent with queue/scheduler
- Specialist Agent templates
- Multi-agent orchestrator
- Fugoku Gateway routing per agent
- YAML/JSON config import

### Phase 3 (Fugoku Cloud)
- Background System Agents
- Team-shared Specialist Agents
- Event-triggered agents (webhooks, schedules)
- Agent marketplace/templates

---

## 8. Open Questions

1. **Agent config format** — Start with UI builder, add YAML/JSON import in Phase 2
2. **Dusk's 300+ assistants** — Evaluate which map to Specialist Agents; likely 10-20 core roles
3. **Agent sharing** — Phase 2 feature; export/import agent configs
4. **Memory storage** — SQLite same as workspace for MVP; separate store if needed
5. **Tool sandboxing** — Code execution needs sandboxing (Docker? VM? restricted process?)

---

*This agent system design positions Dusk as a professional work environment. Agents produce artifacts, respect boundaries, and collaborate.*
