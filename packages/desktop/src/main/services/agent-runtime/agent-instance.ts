import { randomUUID } from 'node:crypto'
import type {
  AgentConfig,
  AgentEvent,
  AgentInput,
  AgentMessage,
  AgentResult,
  AgentState,
  Artifact,
  LLMClient,
  Tool,
  ToolCall,
  ToolExecutionContext,
  ToolResult
} from "../../../../../shared/dist/src/types/agent.js"
import { MemoryStore } from './memory-store'
import { ToolExecutor } from './tool-executor'
import { StreamCheckpointService } from '../stream-checkpoint'

const CHECKPOINT_CHUNK_INTERVAL = 10

export class AgentInstance {
  readonly id: string
  readonly config: AgentConfig
  state: AgentState = 'idle'
  private memoryStore: MemoryStore
  private llmClient: LLMClient
  private tools: Tool[]
  private toolExecutor: ToolExecutor
  private abortController: AbortController | null = null
  private stateChangeListeners: Array<(state: AgentState) => void> = []
  private streamCheckpointService: StreamCheckpointService | null = null
  private currentStreamId: string | null = null
  private currentMessageId: string | null = null
  private textChunkCount = 0

  constructor(
    config: AgentConfig,
    llmClient: LLMClient,
    tools: Tool[],
    memoryStore: MemoryStore,
    streamCheckpointService?: StreamCheckpointService
  ) {
    this.id = config.id
    this.config = config
    this.llmClient = llmClient
    this.tools = tools
    this.memoryStore = memoryStore
    this.streamCheckpointService = streamCheckpointService || null
    this.toolExecutor = new ToolExecutor()
    this.toolExecutor.registerAll(tools)
  }

  getState(): AgentState {
    return this.state
  }

  getConfig(): AgentConfig {
    return this.config
  }

  onStateChange(listener: (state: AgentState) => void): () => void {
    this.stateChangeListeners.push(listener)
    return () => {
      const index = this.stateChangeListeners.indexOf(listener)
      if (index >= 0) {
        this.stateChangeListeners.splice(index, 1)
      }
    }
  }

  async *invokeStream(input: AgentInput): AsyncIterable<AgentEvent> {
    this.abortController = new AbortController()
    const conversationId = input.conversationId || randomUUID()
    this.currentStreamId = null
    this.currentMessageId = null
    this.textChunkCount = 0

    this.setState('working')

    if (this.streamCheckpointService) {
      const messageId = `msg_${randomUUID()}`
      const checkpoint = this.streamCheckpointService.createStreamCheckpoint(
        conversationId,
        messageId
      )
      this.currentStreamId = checkpoint.streamId
      this.currentMessageId = checkpoint.messageId
    }

    try {
      await this.memoryStore.addMessage(conversationId, {
        role: 'user',
        content: input.message,
        timestamp: Date.now()
      })

      const contextMessages = await this.buildContext(conversationId)
      const toolDefinitions = this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))

      const messages: AgentMessage[] = []
      let currentMessages = contextMessages

      while (true) {
        const stream = this.llmClient.stream(currentMessages, toolDefinitions)
        let currentToolCalls: ToolCall[] = []
        let currentText = ''

        for await (const event of stream) {
          if (this.abortController.signal.aborted) {
            yield { type: 'error', error: new Error('Agent execution aborted'), streamId: this.currentStreamId ?? undefined }
            return
          }

          switch (event.type) {
            case 'text_delta':
              currentText += event.content || ''
              yield { type: 'text', content: event.content || '', streamId: this.currentStreamId ?? undefined }
              this.textChunkCount += 1
              if (this.streamCheckpointService && this.currentStreamId) {
                this.maybePersistCheckpoint(conversationId, currentText, currentToolCalls)
              }
              break

            case 'tool_call':
              if (event.toolCall) {
                currentToolCalls.push(event.toolCall)
                yield { type: 'tool_call', toolCall: event.toolCall, streamId: this.currentStreamId ?? undefined }
                if (this.streamCheckpointService && this.currentStreamId) {
                  this.persistCheckpoint(conversationId, currentText, currentToolCalls)
                }
              }
              break

            case 'done':
              if (currentText || currentToolCalls.length > 0) {
                messages.push({
                  role: 'assistant',
                  content: currentText,
                  timestamp: Date.now(),
                  toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined
                })
              }

              for (const toolCall of currentToolCalls) {
                const result = await this.executeTool(toolCall, conversationId)
                yield { type: 'tool_result', toolResult: result, streamId: this.currentStreamId ?? undefined }
                messages.push({
                  role: 'tool',
                  content: result.error || String(result.result),
                  timestamp: Date.now(),
                  toolResults: [result]
                })
              }

              await this.memoryStore.addMessages(conversationId, messages)

              if (currentToolCalls.length === 0) {
                this.setState('completed')
                if (this.streamCheckpointService && this.currentStreamId) {
                  this.streamCheckpointService.completeStream(this.currentStreamId)
                }
                const result: AgentResult = {
                  conversationId,
                  messages: await this.memoryStore.getConversationHistory(conversationId),
                  artifacts: input.artifacts || []
                }
                yield { type: 'done', result, streamId: this.currentStreamId ?? undefined }
                return
              }

              currentMessages = [
                ...currentMessages,
                {
                  role: 'assistant',
                  content: currentText,
                  toolCalls: currentToolCalls,
                  timestamp: Date.now()
                } as AgentMessage,
                ...messages.filter((m) => m.role === 'tool').map((m) => ({
                  role: 'tool' as const,
                  content: m.content,
                  toolResults: m.toolResults,
                  timestamp: Date.now()
                }))
              ]
              break

            case 'error':
              this.setState('failed')
              yield { type: 'error', error: event.content ? new Error(event.content) : new Error('LLM stream error'), streamId: this.currentStreamId ?? undefined }
              return
          }
        }

        if (currentToolCalls.length === 0) {
          break
        }
      }
    } catch (error) {
      this.setState('failed')
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error('Unknown agent error'),
        streamId: this.currentStreamId ?? undefined
      }
    } finally {
      this.abortController = null
    }
  }

  async invoke(input: AgentInput): Promise<AgentResult> {
    const events: AgentEvent[] = []
    for await (const event of this.invokeStream(input)) {
      events.push(event)
    }

    const doneEvent = events.find((e) => e.type === 'done')
    if (doneEvent && doneEvent.type === 'done') {
      return doneEvent.result
    }

    const conversationId = input.conversationId || randomUUID()
    return {
      conversationId,
      messages: [],
      artifacts: input.artifacts || []
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.setState('idle')
  }

  private maybePersistCheckpoint(
    conversationId: string,
    accumulatedContent: string,
    toolCalls: ToolCall[]
  ): void {
    if (this.textChunkCount >= CHECKPOINT_CHUNK_INTERVAL) {
      this.textChunkCount = 0
      this.persistCheckpoint(conversationId, accumulatedContent, toolCalls)
    }
  }

  private persistCheckpoint(
    conversationId: string,
    accumulatedContent: string,
    toolCalls: ToolCall[]
  ): void {
    if (!this.streamCheckpointService) return

    if (!this.currentStreamId || !this.currentMessageId) {
      const messageId = `msg_${randomUUID()}`
      const checkpoint = this.streamCheckpointService.createStreamCheckpoint(
        conversationId,
        messageId
      )
      this.currentStreamId = checkpoint.streamId
      this.currentMessageId = checkpoint.messageId
    }

    this.streamCheckpointService.updateCheckpoint(this.currentStreamId, {
      accumulatedContent,
      toolCalls: toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
    })
  }

  private async executeTool(
    toolCall: ToolCall,
    conversationId: string
  ): Promise<ToolResult> {
    const context: ToolExecutionContext = {
      agentId: this.id,
      conversationId,
      permissions: this.config.permissions || {
        allowFileRead: true,
        allowFileWrite: true,
        allowNetwork: false,
        maxRequestsPerMinute: 60
      },
      workingDirectory: process.cwd()
    }

    return this.toolExecutor.execute(toolCall.name, toolCall.arguments, context)
  }

  private async buildContext(conversationId: string): Promise<AgentMessage[]> {
    const messages: AgentMessage[] = []

    if (this.config.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.config.systemPrompt,
        timestamp: Date.now()
      })
    }

    const history = await this.memoryStore.getConversationHistory(conversationId)
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })
    }

    return messages
  }

  private setState(state: AgentState): void {
    this.state = state
    for (const listener of this.stateChangeListeners) {
      listener(state)
    }
  }
}
