import type {
  AgentConfig,
  AgentEvent,
  AgentInput,
  AgentInstance,
  AgentResult,
  AgentState,
} from "../../../../../shared/dist/src/types/agent.js"
import type { AgentRuntimeServiceOptions } from './agent-runtime-service'
import { AgentRuntimeService } from './agent-runtime-service'
import { WorkspaceAgent } from './workspace-agent'
import { SpecialistAgent } from './specialist-agent'
import { TaskAgent } from './task-agent'
import { JobQueueService } from '../job-queue'

type EventListener = (event: AgentEvent) => void

export interface AgentOrchestratorOptions {
  llmClient: unknown
  memoryStore?: unknown
  db?: { drizzle: unknown; raw: unknown }
  jobQueueService?: JobQueueService
}

export class AgentOrchestrator {
  private runtime: AgentRuntimeService
  private activeAgentId = 'default-workspace'
  private agentInstances: Map<string, AgentInstance> = new Map()
  private eventListeners: Set<EventListener> = new Set()

  constructor(options: AgentOrchestratorOptions) {
    const runtimeOptions: AgentRuntimeServiceOptions = {
      llmClient: options.llmClient as never,
      memoryStore: options.memoryStore as never,
      db: options.db,
      jobQueueService: options.jobQueueService
    }
    this.runtime = new AgentRuntimeService(runtimeOptions)
    this.initializeDefaultAgents()
  }

  private initializeDefaultAgents(): void {
    const workspaceAgent = WorkspaceAgent.create(this.runtime)
    this.agentInstances.set('default-workspace', workspaceAgent.getInstance())

    const specialistAgent = SpecialistAgent.create('default-specialist', this.runtime)
    this.agentInstances.set('default-specialist', specialistAgent.getInstance())

    const taskAgent = TaskAgent.create('default-task', this.runtime)
    this.agentInstances.set('default-task', taskAgent.getInstance())
  }

  getAgent(id: string): AgentInstance | undefined {
    return this.agentInstances.get(id)
  }

  getActiveAgent(): AgentInstance {
    const agent = this.agentInstances.get(this.activeAgentId)
    if (!agent) {
      return this.agentInstances.get('default-workspace')!
    }
    return agent
  }

  getActiveAgentId(): string {
    return this.activeAgentId
  }

  async switchAgent(agentId: string): Promise<boolean> {
    if (this.agentInstances.has(agentId)) {
      this.activeAgentId = agentId
      this.emit({ type: 'state_change', state: 'idle' })
      return true
    }
    return false
  }

  listAgents(): AgentConfig[] {
    return this.runtime.listAgents()
  }

  createAgent(config: AgentConfig): AgentInstance {
    return this.runtime.createAgent(config)
  }

  getAgentConfig(id: string): AgentConfig | undefined {
    return this.runtime.getAgentConfig(id)
  }

  updateAgent(id: string, updates: Partial<AgentConfig>): AgentInstance | undefined {
    return this.runtime.updateAgent(id, updates)
  }

  deleteAgent(id: string): boolean {
    if (id === 'default-workspace' || id === 'default-specialist' || id === 'default-task') {
      return false
    }
    return this.runtime.deleteAgent(id)
  }

  async invoke(input: AgentInput): Promise<AgentResult> {
    const agent = this.getActiveAgent()
    return agent.invoke(input)
  }

  invokeStream(input: AgentInput): AsyncIterable<AgentEvent> {
    const agent = this.getActiveAgent()
    return agent.invokeStream(input)
  }

  stopAgent(id: string): boolean {
    const agent = this.agentInstances.get(id)
    if (agent) {
      agent.stop()
      return true
    }
    return this.runtime.stopAgent(id)
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  getAgentStatuses(): Array<{ id: string; type: string; state: AgentState }> {
    return Array.from(this.agentInstances.entries()).map(([id, instance]) => ({
      id,
      type: id.startsWith('default-specialist') ? 'specialist' : id.startsWith('default-task') ? 'task' : 'workspace',
      state: instance.getState(),
    }))
  }

  async enqueueJob(agentId: string, workspaceId: string, input: Record<string, unknown>): Promise<unknown> {
    return this.runtime.enqueueJob(agentId, workspaceId, input)
  }

  getStreamCheckpointService() {
    return this.runtime.getStreamCheckpointService()
  }

  getJobQueueService() {
    return this.runtime.getJobQueueService()
  }

  shutdown(): void {
    for (const agent of this.agentInstances.values()) {
      agent.stop()
    }
    this.agentInstances.clear()
    this.eventListeners.clear()
    this.runtime.shutdown()
  }

  private emit(event: AgentEvent): void {
    for (const listener of this.eventListeners) {
      listener(event)
    }
  }
}
