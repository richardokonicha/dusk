import type {
  AgentConfig,
  AgentEvent,
  AgentInput,
  AgentResult,
  AgentState,
  Artifact,
  LLMClient,
  Tool
} from "../../../../../shared/dist/src/types/agent.js"
import { AgentInstance } from './agent-instance'
import { MemoryStore } from './memory-store'
import { StreamCheckpointService } from '../stream-checkpoint'
import { JobQueueService } from '../job-queue'
import { ReadFileTool } from './builtin-tools/read-file-tool'
import { WriteFileTool } from './builtin-tools/write-file-tool'
import { ListFilesTool } from './builtin-tools/list-files-tool'

type EventListener = (event: AgentEvent) => void

export interface AgentRuntimeServiceOptions {
  llmClient: LLMClient
  memoryStore?: MemoryStore
  db?: { drizzle: unknown; raw: unknown }
  jobQueueService?: JobQueueService
}

export class AgentRuntimeService {
  private agents: Map<string, AgentInstance> = new Map()
  private configs: Map<string, AgentConfig> = new Map()
  private llmClient: LLMClient
  private memoryStore: MemoryStore
  private eventListeners: Set<EventListener> = new Set()
  private builtinTools: Tool[] = []
  private streamCheckpointService: StreamCheckpointService | null = null
  private jobQueueService: JobQueueService | null = null

  constructor(options: AgentRuntimeServiceOptions) {
    this.llmClient = options.llmClient
    this.memoryStore = options.memoryStore || new MemoryStore()
    this.builtinTools = [new ReadFileTool(), new WriteFileTool(), new ListFilesTool()]

    if (options.db) {
      try {
        this.streamCheckpointService = new StreamCheckpointService({
          drizzle: options.db.drizzle as any,
          raw: options.db.raw as any
        })
      } catch (error) {
        console.error('Failed to initialize StreamCheckpointService:', error)
      }
    }

    if (options.jobQueueService) {
      this.jobQueueService = options.jobQueueService
      this.jobQueueService.setAgentRuntime({
        getAgent: (id: string) => this.agents.get(id) || undefined,
      })
    }
  }

  createAgent(config: AgentConfig): AgentInstance {
    const instance = new AgentInstance(
      config,
      this.llmClient,
      this.getToolsForAgent(config),
      this.memoryStore,
      this.streamCheckpointService || undefined
    )

    instance.onStateChange((state) => {
      this.emit({ type: 'state_change', state })
    })

    this.agents.set(config.id, instance)
    this.configs.set(config.id, config)
    return instance
  }

  getAgent(id: string): AgentInstance | undefined {
    return this.agents.get(id)
  }

  getAgentConfig(id: string): AgentConfig | undefined {
    return this.configs.get(id)
  }

  listAgents(): AgentConfig[] {
    return Array.from(this.configs.values())
  }

  updateAgent(id: string, updates: Partial<AgentConfig>): AgentInstance | undefined {
    const existing = this.configs.get(id)
    if (!existing) return undefined

    const updated: AgentConfig = { ...existing, ...updates }
    this.configs.set(id, updated)

    const instance = this.agents.get(id)
    if (instance) {
      Object.defineProperty(instance, 'config', {
        value: updated,
        writable: true,
        configurable: true,
        enumerable: true
      })
    }

    return instance
  }

  deleteAgent(id: string): boolean {
    const instance = this.agents.get(id)
    if (instance) {
      instance.stop()
      this.agents.delete(id)
    }
    return this.configs.delete(id)
  }

  async invoke(input: AgentInput): Promise<AgentResult> {
    const agent = this.resolveAgent(input)
    try {
      return await agent.invoke(input)
    } catch (error) {
      this.emit({
        type: 'error',
        error: error instanceof Error ? error : new Error('Unknown agent error')
      })
      throw error
    }
  }

  invokeStream(input: AgentInput): AsyncIterable<AgentEvent> {
    const agent = this.resolveAgent(input)
    return {
      [Symbol.asyncIterator]: async function* () {
        try {
          for await (const event of agent.invokeStream(input)) {
            yield event
          }
        } catch (error) {
          yield {
            type: 'error',
            error: error instanceof Error ? error : new Error('Stream error')
          }
        }
      }
    }
  }

  async enqueueJob(agentId: string, workspaceId: string, input: Record<string, unknown>): Promise<unknown> {
    if (!this.jobQueueService) {
      throw new Error('JobQueueService not configured')
    }
    return this.jobQueueService.enqueue({ agentId, workspaceId, input })
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  stopAgent(id: string): boolean {
    const agent = this.agents.get(id)
    if (agent) {
      agent.stop()
      return true
    }
    return false
  }

  shutdown(): void {
    for (const agent of this.agents.values()) {
      agent.stop()
    }
    this.agents.clear()
    this.configs.clear()
    this.eventListeners.clear()
    this.memoryStore.close()
    if (this.streamCheckpointService) {
      this.streamCheckpointService = null
    }
  }

  createDefaultWorkspaceAgent(): AgentInstance {
    const config: AgentConfig = {
      id: 'default-workspace',
      type: 'workspace',
      name: 'Workspace Agent',
      description: 'Default workspace agent for general tasks',
      model: 'default',
      temperature: 0.7,
      maxTokens: 4096,
      permissions: {
        allowFileRead: true,
        allowFileWrite: true,
        allowNetwork: false,
        maxRequestsPerMinute: 60
      },
      memory: {
        shortTermMaxMessages: 50,
        longTermEnabled: false
      }
    }

    return this.createAgent(config)
  }

  getStreamCheckpointService(): StreamCheckpointService | null {
    return this.streamCheckpointService
  }

  getJobQueueService(): JobQueueService | null {
    return this.jobQueueService
  }

  private getToolsForAgent(config: AgentConfig): Tool[] {
    if (config.tools && config.tools.length > 0) {
      return this.builtinTools.filter((tool) => config.tools!.includes(tool.name))
    }
    return this.builtinTools
  }

  private resolveAgent(input: AgentInput): AgentInstance {
    const agentId = input.metadata?.agentId as string | undefined
    if (agentId) {
      const agent = this.agents.get(agentId)
      if (agent) return agent
    }
    const defaultAgent = this.configs.get('default-workspace')
    if (!defaultAgent) {
      this.createDefaultWorkspaceAgent()
    }
    return this.agents.get('default-workspace')!
  }

  private resolveAgentForInput(input: { message: string; metadata?: Record<string, unknown> }): AgentInstance {
    const agentId = input.metadata?.agentId as string | undefined
    if (agentId) {
      const agent = this.agents.get(agentId)
      if (agent) return agent
    }
    const defaultAgent = this.configs.get('default-workspace')
    if (!defaultAgent) {
      this.createDefaultWorkspaceAgent()
    }
    return this.agents.get('default-workspace')!
  }

  private emit(event: AgentEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Event listener error:', error)
      }
    }
  }
}
