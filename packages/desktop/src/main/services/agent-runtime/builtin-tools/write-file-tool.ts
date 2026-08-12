import type { Tool, ToolExecutionContext, ToolResult } from "../../../../../../shared/dist/src/types/agent.js"
import fs from 'node:fs/promises'
import path from 'node:path'

export class WriteFileTool implements Tool {
  name = 'write_file'
  description = 'Write content to a file, creating it if it does not exist'
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file' },
      content: { type: 'string', description: 'Content to write to the file' }
    },
    required: ['path', 'content']
  }

  async execute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const filePath = String(params.path)
    const content = String(params.content)

    try {
      if (!context.permissions.allowFileWrite) {
        return {
          toolCallId: '',
          name: this.name,
          result: null,
          error: 'Permission denied: file write not allowed',
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

      await fs.mkdir(path.dirname(absolutePath), { recursive: true })
      await fs.writeFile(absolutePath, content, 'utf-8')

      return {
        toolCallId: '',
        name: this.name,
        result: { path: absolutePath, bytesWritten: Buffer.byteLength(content, 'utf-8') },
        durationMs: 0
      }
    } catch (error) {
      return {
        toolCallId: '',
        name: this.name,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to write file',
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
