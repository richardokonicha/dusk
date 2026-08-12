# API Reference

This section documents the internal APIs and extension points for Dusk.

## Provider Interface

All providers implement the `Provider` interface:

```typescript
interface Provider {
  id: string
  name: string
  models: Model[]
  connect(config: ProviderConfig): Promise<void>
  chat(messages: Message[], model: Model): Promise<Stream>
  disconnect(): Promise<void>
}
```

## Model Types

```typescript
interface Model {
  id: string
  name: string
  provider: string
  contextWindow: number
  supportsStreaming: boolean
  supportsTools: boolean
}
```

## Message Types

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: Attachment[]
  timestamp: Date
}

interface Attachment {
  id: string
  name: string
  mimeType: string
  size: number
  url?: string
}
```

## Workspace API

```typescript
interface Workspace {
  id: string
  name: string
  description?: string
  icon?: string
  providerId: string
  settings: WorkspaceSettings
  createdAt: Date
  updatedAt: Date
}
```

## Agent API

```typescript
interface Agent {
  id: string
  name: string
  type: 'chat' | 'task' | 'coding'
  tools: Tool[]
  systemPrompt: string
  model: Model
  settings: AgentSettings
}
```

## Event Hooks

Dusk exposes events for extensions and integrations:

```typescript
interface DuskEvents {
  'workspace:created': (workspace: Workspace) => void
  'workspace:switched': (workspaceId: string) => void
  'message:sent': (message: Message) => void
  'message:received': (message: Message) => void
  'agent:started': (agent: Agent) => void
  'agent:finished': (agent: Agent, result: string) => void
}
```

## Configuration

```typescript
interface DuskConfig {
  theme: 'crescent' | 'dusk' | 'midnight' | 'light'
  accentColor: string
  cloudSync: boolean
  providers: ProviderConfig[]
  shortcuts: Shortcut[]
}
```
