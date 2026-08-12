import type { Tool, ToolExecutionContext, ToolResult } from "../../../../../../shared/dist/src/types/agent.js"
import fs from 'node:fs/promises'
import path from 'node:path'

export class ReadFileTool implements Tool {
  name = 'read_file'
  description = 'Read the contents of a file'
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file' },
      limit: { type: 'number', description: 'Maximum number of lines to read' }
    },
    required: ['path']
  }

  async execute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const filePath = String(params.path)
    const limit = params.limit ? Number(params.limit) : undefined

    try {
      if (!context.permissions.allowFileRead) {
        return {
          toolCallId: '',
          name: this.name,
          result: null,
          error: 'Permission denied: file read not allowed',
          durationMs: 0
        }
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(context.workingDirectory, filePath)

      if (!this.isPathAllowed(absolutePath, context.permissions)) {
        return {
          toolCallId: '',
          name: this.name,
          result: null,
          error: 'Access denied: path is blocked by permissions',
          durationMs: 0
        }
      }

      let content = await fs.readFile(absolutePath, 'utf-8')

      if (limit && typeof limit === 'number' && Number.isFinite(limit)) {
        const lines = content.split('\n')
        content = lines.slice(0, limit).join('\n')
      }

      return {
        toolCallId: '',
        name: this.name,
        result: { path: absolutePath, content },
        durationMs: 0
      }
    } catch (error) {
      return {
        toolCallId: '',
        name: this.name,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to read file',
        durationMs: 0
      }
    }
  }

  private isPathAllowed(targetPath: string, permissions: { allowedPaths?: string[]; blockedPaths?: string[] }): boolean {
    if (permissions.blockedPaths && permissions.blockedPaths.length > 0) {
      for (const blocked of permissions.blockedPaths) {
        if (targetPath.startsWith(blocked)) {
          return false
        }
      }
    }

    if (permissions.allowedPaths && permissions.allowedPaths.length > 0) {
      for (const allowed of permissions.allowedPaths) {
        if (targetPath.startsWith(allowed)) {
          return true
        }
      }
      return false
    }

    return true
  }
}
