import type {
  AgentConfig,
  AgentEvent,
  AgentInput,
  AgentInstance,
  AgentResult,
  AgentState,
} from "../../../../../shared/dist/src/types/agent.js"
import { AgentRuntimeService } from './agent-runtime-service'

export class SpecialistAgent {
  readonly id: string
  readonly type = 'specialist'

  constructor(id: string, private instance: AgentInstance) {
    this.id = id
  }

  static create(id: string, runtime: AgentRuntimeService): SpecialistAgent {
    const instance = runtime.createAgent({
      id,
      type: 'specialist',
      name: 'Specialist Agent',
      description: 'Specialized agent for domain-specific tasks',
      model: 'default',
      temperature: 0.3,
      maxTokens: 4096,
      permissions: {
        allowFileRead: true,
        allowFileWrite: false,
        allowNetwork: true,
        maxRequestsPerMinute: 30,
        allowedPaths: [],
        blockedPaths: [],
      },
      memory: {
        shortTermMaxMessages: 100,
        longTermEnabled: true,
      },
    })
    return new SpecialistAgent(id, instance)
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
