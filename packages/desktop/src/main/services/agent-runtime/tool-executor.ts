import type { Tool, ToolExecutionContext, ToolResult } from "../../../../../shared/dist/src/types/agent.js"
import { randomUUID } from 'node:crypto'

export class ToolExecutor {
  private tools: Map<string, Tool> = new Map()

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getToolDefinitions(): Array<{
    name: string
    description: string
    parameters: Record<string, unknown>
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }))
  }

  async execute(
    name: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return {
        toolCallId: randomUUID(),
        name,
        result: null,
        error: `Tool not found: ${name}`,
        durationMs: 0
      }
    }

    if (!this.checkPermissions(name, params, context)) {
      return {
        toolCallId: randomUUID(),
        name,
        result: null,
        error: `Permission denied for tool: ${name}`,
        durationMs: 0
      }
    }

    const start = Date.now()
    try {
      const result = await tool.execute(params, context)
      return {
        ...result,
        durationMs: Date.now() - start
      }
    } catch (error) {
      return {
        toolCallId: randomUUID(),
        name,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - start
      }
    }
  }

  private checkPermissions(
    name: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): boolean {
    const perms = context.permissions

    if (name === 'read_file' && !perms.allowFileRead) {
      return false
    }
    if ((name === 'write_file' || name === 'edit_file') && !perms.allowFileWrite) {
      return false
    }

    if (perms.blockedPaths && typeof params.path === 'string') {
      const target = params.path
      for (const blocked of perms.blockedPaths) {
        if (target.startsWith(blocked)) {
          return false
        }
      }
    }

    return true
  }
}
