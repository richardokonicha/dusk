import type {
  AgentConfig,
  AgentEvent,
  AgentInput,
  AgentInstance,
  AgentResult,
  AgentState,
} from "../../../../../shared/dist/src/types/agent.js"
import { AgentRuntimeService } from './agent-runtime-service'

export class WorkspaceAgent {
  readonly id = 'default-workspace'
  readonly type = 'workspace'

  constructor(private instance: AgentInstance) {}

  static create(runtime: AgentRuntimeService): WorkspaceAgent {
    const instance = runtime.createDefaultWorkspaceAgent()
    return new WorkspaceAgent(instance)
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
