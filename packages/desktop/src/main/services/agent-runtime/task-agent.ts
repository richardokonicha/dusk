import type {
  AgentConfig,
  AgentEvent,
  AgentInput,
  AgentInstance,
  AgentResult,
  AgentState,
} from "../../../../../shared/dist/src/types/agent.js"
import { AgentRuntimeService } from './agent-runtime-service'

export class TaskAgent {
  readonly id: string
  readonly type = 'task'

  constructor(id: string, private instance: AgentInstance) {
    this.id = id
  }

  static create(id: string, runtime: AgentRuntimeService): TaskAgent {
    const instance = runtime.createAgent({
      id,
      type: 'task',
      name: 'Task Agent',
      description: 'Autonomous agent for executing multi-step tasks',
      model: 'default',
      temperature: 0.5,
      maxTokens: 8192,
      permissions: {
        allowFileRead: true,
        allowFileWrite: true,
        allowNetwork: true,
        maxRequestsPerMinute: 120,
        allowedPaths: [],
        blockedPaths: [],
      },
      memory: {
        shortTermMaxMessages: 200,
        longTermEnabled: true,
      },
    })
    return new TaskAgent(id, instance)
  }

  getInstance(): AgentInstance {
    return this.instance
  }

  getState(): AgentState {
    return this.instance.getState()
  }

  async invoke(input: AgentInput): Promise<AgentResult> {
    return this.instance.invoke(input)
  }

  invokeStream(input: AgentInput): AsyncIterable<AgentEvent> {
    return this.instance.invokeStream(input)
  }

  stop(): void {
    this.instance.stop()
  }
}
