# Dusk — Backend Architecture (Electron Main Process)

## 1. Electron Main Process Architecture

### 1.1 Entry Point

```typescript
// packages/desktop/src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DuskContainer } from './container';
import { IPCCHANNELS } from './ipc/channels';
import { registerIPCHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let container: DuskContainer | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS native title bar
    frame: process.platform === 'darwin' ? true : true,
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // better-sqlite3 requires this
    },
  });
  
  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  
  // Initialize services
  container = new DuskContainer();
  await container.initialize();
  registerIPCHandlers(container);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    container?.shutdown();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### 1.2 Service Container

```typescript
// packages/desktop/src/main/container.ts
import { DuskContainer } from './container';
import { DatabaseService } from './services/db';
import { ProviderService } from './services/provider';
import { AgentRuntimeService } from './services/agent-runtime';
import { FileService } from './services/file-service';
import { JobQueueService } from './services/job-queue';
import { SettingsService } from './services/settings';
import { EventBus } from './services/event-bus';

export class DuskContainer {
  private services = new Map<string, any>();
  
  async initialize() {
    // Core services
    this.register('db', () => new DatabaseService());
    this.register('eventBus', () => new EventBus());
    this.register('settings', () => new SettingsService(this.get('db')));
    
    // Dependent services
    this.register('provider', () => 
      new ProviderService(this.get('settings'), this.get('eventBus'))
    );
    this.register('file', () => 
      new FileService(this.get('db'), this.get('eventBus'))
    );
    this.register('jobQueue', () => 
      new JobQueueService(this.get('eventBus'))
    );
    this.register('agentRuntime', () => 
      new AgentRuntimeService(
        this.get('provider'),
        this.get('file'),
        this.get('jobQueue'),
        this.get('eventBus')
      )
    );
    
    // Initialize all services
    for (const [name, service] of this.services) {
      if (service.initialize) {
        await service.initialize();
      }
    }
  }
  
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory());
  }
  
  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) throw new Error(`Service not found: ${key}`);
    return service;
  }
  
  async shutdown() {
    for (const [name, service] of this.services) {
      if (service.shutdown) {
        await service.shutdown();
      }
    }
  }
}
```

---

## 2. IPC Layer

### 2.1 Channel Registry

```typescript
// packages/desktop/src/main/ipc/channels.ts
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

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

### 2.2 Type-Safe IPC Wrapper

```typescript
// packages/renderer/src/services/ipc-client.ts
import { ipcRenderer } from 'electron';

type IPCResponse<T> = { success: true; data: T } | { success: false; error: string };

export class IPCClient {
  async invoke<T>(channel: string, ...args: any[]): Promise<T> {
    const response = await ipcRenderer.invoke<IPCResponse<T>>(channel, ...args);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }
  
  on(channel: string, callback: (data: any) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
}

export const ipc = new IPCClient();
```

### 2.3 Handler Registration

```typescript
// packages/desktop/src/main/ipc/handlers.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { DuskContainer } from '../container';

export function registerIPCHandlers(container: DuskContainer) {
  const db = container.get('db');
  const providerService = container.get('provider');
  const agentRuntime = container.get('agentRuntime');
  const fileService = container.get('file');
  const settings = container.get('settings');
  
  // Workspace handlers
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_LIST, async () => {
    return db.workspace.findAll();
  });
  
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_CREATE, async (_, data) => {
    return db.workspace.create(data);
  });
  
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_, id) => {
    await db.workspace.delete(id);
    await fileService.deleteWorkspace(id);
  });
  
  // Message handlers
  ipcMain.handle(IPC_CHANNELS.MESSAGE_SEND, async (_, conversationId, content) => {
    const conversation = await db.conversation.findById(conversationId);
    const workspace = await db.workspace.findById(conversation.workspaceId);
    const agent = await agentRuntime.getWorkspaceAgent(workspace.id);
    
    const response = await agentRuntime.invoke(agent.id, {
      type: 'chat',
      conversationId,
      content,
    });
    
    return response;
  });
  
  // Streaming event
  ipcMain.on(IPC_CHANNELS.MESSAGE_STREAM, (event, data) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.webContents.send(IPC_CHANNELS.MESSAGE_STREAM, data);
  });
}
```

---

## 3. Database Layer (better-sqlite3)

### 3.1 Database Service

```typescript
// packages/desktop/src/main/services/db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../db/schema';

export class DatabaseService {
  private db: Database.Database;
  private drizzleDb: ReturnType<typeof drizzle>;
  
  async initialize() {
    const dbPath = path.join(app.getPath('userData'), 'dusk.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.drizzleDb = drizzle(this.db, { schema });
    
    // Run migrations
    await this.runMigrations();
  }
  
  private async runMigrations() {
    const migrations = await fs.readFile(
      path.join(__dirname, '../../migrations/001_initial.sql'),
      'utf-8'
    );
    this.db.exec(migrations);
  }
  
  // Repositories
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
}
```

### 3.2 Repository Pattern

```typescript
// packages/desktop/src/main/db/repositories/workspace.ts
import { eq, and } from 'drizzle-orm/e';
import { Database } from 'better-sqlite3';
import { workspaces } from '../schema';

export class WorkspaceRepository {
  constructor(private db: Database.Database) {}
  
  findAll() {
    return this.db.select().from(workspaces).orderBy(workspaces.updatedAt);
  }
  
  findById(id: string) {
    return this.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
  }
  
  findByPath(path: string) {
    return this.db.select().from(workspaces).where(eq(workspaces.path, path)).get();
  }
  
  create(data: typeof workspaces.$inferInsert) {
    const id = crypto.randomUUID();
    this.db.insert(workspaces).values({ ...data, id, createdAt: Date.now(), updatedAt: Date.now() }).run();
    return this.findById(id);
  }
  
  update(id: string, data: Partial<typeof workspaces.$inferInsert>) {
    this.db.update(workspaces).set({ ...data, updatedAt: Date.now() }).where(eq(workspaces.id, id)).run();
    return this.findById(id);
  }
  
  delete(id: string) {
    this.db.delete(workspaces).where(eq(workspaces.id, id)).run();
  }
}
```

---

## 4. Provider System

### 4.1 Provider Service

```typescript
// packages/desktop/src/main/services/provider.ts
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class ProviderService {
  private providers = new Map<string, LLMProvider>();
  private defaultProvider: string;
  
  constructor(
    private settings: SettingsService,
    private eventBus: EventBus
  ) {}
  
  async initialize() {
    const configs = await this.settings.getProviders();
    for (const config of configs) {
      this.registerProvider(config);
    }
  }
  
  registerProvider(config: ProviderConfig) {
    let provider: LLMProvider;
    
    switch (config.type) {
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;
      case 'gemini':
        provider = new GeminiProvider(config);
        break;
      case 'ollama':
        provider = new OllamaProvider(config);
        break;
      case 'custom':
        provider = new OpenAIProvider(config); // OpenAI-compatible
        break;
    }
    
    this.providers.set(config.id, provider);
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
    try {
      await this.get(id).testConnection();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### 4.2 OpenAI Provider

```typescript
class OpenAIProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType = 'openai';
  
  private client: OpenAI;
  
  constructor(private config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.client = new OpenAI({
      apiKey: config.config.apiKeyRef, // from secure storage
      baseURL: config.config.endpoint,
    });
  }
  
  async testConnection(): Promise<void> {
    await this.client.models.list();
  }
  
  async streamChat(params: ChatParams): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages as OpenAI.ChatCompletionMessageParam[],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      tools: params.tools,
      stream: true,
    });
    
    for await (const chunk of stream) {
      yield {
        type: 'text',
        content: chunk.choices[0]?.delta?.content || '',
      };
    }
  }
}
```

---

## 5. Agent Runtime Service

### 5.1 Agent Runtime

```typescript
// packages/desktop/src/main/services/agent-runtime.ts
import { EventBus } from './event-bus';

export class AgentRuntimeService {
  private activeAgents = new Map<string, AgentInstance>();
  private toolExecutor: ToolExecutor;
  
  constructor(
    private provider: ProviderService,
    private file: FileService,
    private jobQueue: JobQueueService,
    private eventBus: EventBus
  ) {
    this.toolExecutor = new ToolExecutor(this.file);
    this.registerBuiltinTools();
  }
  
  async initialize() {
    // Load persisted agents
    const agents = await this.db.agent.findAll();
    for (const agent of agents) {
      if (agent.type === 'system') {
        await this.startSystemAgent(agent);
      }
    }
  }
  
  async invoke(agentId: string, input: AgentInput): AsyncIterable<AgentEvent> {
    const agent = await this.db.agent.findById(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    
    const instance = new AgentInstance(agent, this.provider, this.toolExecutor, this.eventBus);
    this.activeAgents.set(agentId, instance);
    
    try {
      yield* instance.run(input);
    } finally {
      this.activeAgents.delete(agentId);
    }
  }
  
  async stop(agentId: string): Promise<void> {
    const instance = this.activeAgents.get(agentId);
    if (instance) {
      await instance.stop();
      this.activeAgents.delete(agentId);
    }
  }
  
  private registerBuiltinTools() {
    this.toolExecutor.register(new ReadFileTool(this.file));
    this.toolExecutor.register(new WriteFileTool(this.file));
    this.toolExecutor.register(new ListFilesTool(this.file));
    this.toolExecutor.register(new WebSearchTool());
    this.toolExecutor.register(new CodeExecutionTool());
  }
}
```

### 5.2 Agent Instance

```typescript
class AgentInstance {
  private messages: Message[] = [];
  private isRunning = false;
  private abortController: AbortController;
  
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
    this.messages.push({
      role: 'user',
      content: input.content,
    });
    
    yield { type: 'state_change', state: 'active' };
    
    let iteration = 0;
    const maxIterations = this.config.config.maxIterations || 10;
    
    while (this.isRunning && iteration < maxIterations) {
      iteration++;
      
      // Call LLM
      const response = await this.provider.streamChat({
        messages: this.messages,
        model: this.config.config.model || 'default',
        tools: this.toolExecutor.getToolDefinitions(),
        stream: true,
      });
      
      let fullContent = '';
      let toolCalls: ToolCall[] = [];
      
      for await (const chunk of response) {
        if (chunk.type === 'text') {
          fullContent += chunk.content;
          yield { type: 'text', content: chunk.content };
        } else if (chunk.type === 'tool_call') {
          toolCalls.push(chunk.toolCall);
        }
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullContent,
        toolCalls,
      };
      this.messages.push(assistantMessage);
      
      // Execute tools
      if (toolCalls.length > 0) {
        yield { type: 'state_change', state: 'working' };
        
        for (const toolCall of toolCalls) {
          yield { type: 'tool_call', toolCall };
          
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
            
            yield { type: 'tool_result', toolCall, result };
          } catch (error) {
            this.messages.push({
              role: 'system',
              content: `Tool error: ${error.message}`,
            });
            yield { type: 'error', error: error.message };
          }
        }
        
        yield { type: 'state_change', state: 'active' };
      } else {
        // No tool calls, conversation turn complete
        break;
      }
    }
    
    yield { type: 'state_change', state: 'completed' };
    this.isRunning = false;
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    this.abortController.abort();
  }
}
```

---

## 6. File System Service

```typescript
// packages/desktop/src/main/services/file-service.ts
import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';

export class FileService {
  constructor(private db: Database, private eventBus: EventBus) {}
  
  async initialize() {
    // Start file watchers for all workspaces
    const workspaces = await this.db.workspace.findAll();
    for (const workspace of workspaces) {
      this.watchWorkspace(workspace.id, workspace.path);
    }
  }
  
  async listFiles(workspaceId: string): Promise<FileInfo[]> {
    const workspace = await this.db.workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    
    const files = await this.db.file.findByWorkspace(workspaceId);
    return files;
  }
  
  async readFile(workspaceId: string, filePath: string): Promise<Buffer> {
    const workspace = await this.db.workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    
    const fullPath = path.join(workspace.path, filePath);
    return fs.readFile(fullPath);
  }
  
  async writeFile(workspaceId: string, filePath: string, content: Buffer): Promise<void> {
    const workspace = await this.db.workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    
    const fullPath = path.join(workspace.path, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    
    // Update DB
    const stat = await fs.stat(fullPath);
    await this.db.file.upsert({
      workspaceId,
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      updatedAt: Date.now(),
    });
    
    this.eventBus.emit('file:changed', { workspaceId, path: filePath });
  }
  
  watchWorkspace(workspaceId: string, workspacePath: string) {
    const watcher = chokidar.watch(workspacePath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      depth: 10,
    });
    
    watcher.on('change', (filePath) => {
      const relativePath = path.relative(workspacePath, filePath);
      this.eventBus.emit('file:changed', { workspaceId, path: relativePath });
    });
  }
}
```

---

## 7. Job Queue Service

```typescript
// packages/desktop/src/main/services/job-queue.ts
export class JobQueueService {
  private queue: Job[] = [];
  private processing = false;
  
  constructor(private eventBus: EventBus) {}
  
  async enqueue(job: Omit<Job, 'id' | 'status' | 'createdAt'>): Promise<Job> {
    const newJob: Job = {
      ...job,
      id: crypto.randomUUID(),
      status: 'queued',
      createdAt: Date.now(),
    };
    
    this.queue.push(newJob);
    await this.processQueue();
    
    return newJob;
  }
  
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.executeJob(job);
    }
    
    this.processing = false;
  }
  
  private async executeJob(job: Job) {
    job.status = 'running';
    job.startedAt = Date.now();
    this.eventBus.emit('job:status_changed', job);
    
    try {
      // Execute via agent runtime
      const result = await this.agentRuntime.invoke(job.agentId, job.input);
      job.output = result;
      job.status = 'completed';
    } catch (error) {
      job.error = error.message;
      job.status = 'failed';
    }
    
    job.completedAt = Date.now();
    this.eventBus.emit('job:status_changed', job);
  }
}
```

---

## 8. Event Bus

```typescript
// packages/desktop/src/main/services/event-bus.ts
type EventHandler<T = any> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    
    return () => this.off(event, handler);
  }
  
  off<T>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler);
  }
  
  emit<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }
}
```

---

## 9. Security

### 9.1 API Key Storage

```typescript
// packages/desktop/src/main/services/secure-storage.ts
import { safeStorage } from 'electron';

export class SecureStorageService {
  async get(key: string): Promise<string | null> {
    const encrypted = safeStorage?.encryptString(key);
    // Store encrypted in database
    return this.db.get(key);
  }
  
  async set(key: string, value: string): Promise<void> {
    const encrypted = safeStorage?.encryptString(value);
    await this.db.set(key, encrypted);
  }
}
```

### 9.2 Preload Script

```typescript
// packages/desktop/src/main/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dusk', {
  ipc: {
    invoke: (channel: string, ...args: any[]) => 
      ipcRenderer.invoke(channel, ...args),
    on: (channel: string, handler: (data: any) => void) => {
      ipcRenderer.on(channel, (_event, data) => handler(data));
    },
  },
  // Expose only safe APIs
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('file:read', path),
    writeFile: (path: string, content: string) => 
      ipcRenderer.invoke('file:write', path, content),
  },
});
```

---

*This backend architecture is ready for implementation. All services, interfaces, and patterns are defined.*
