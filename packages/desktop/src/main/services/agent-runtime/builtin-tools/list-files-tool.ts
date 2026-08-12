import type { Tool, ToolExecutionContext, ToolResult } from "../../../../../../shared/dist/src/types/agent.js"
import fs from 'node:fs/promises'
import path from 'node:path'

export class ListFilesTool implements Tool {
  name = 'list_files'
  description = 'List files and directories at a given path'
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative directory path' },
      recursive: { type: 'boolean', description: 'Whether to list recursively' }
    },
    required: ['path']
  }

  async execute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const dirPath = String(params.path)
    const recursive = params.recursive === true

    try {
      if (!context.permissions.allowFileRead) {
        return {
          toolCallId: '',
          name: this.name,
          result: null,
          error: 'Permission denied: file listing not allowed',
          durationMs: 0
        }
      }

      const absolutePath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(context.workingDirectory, dirPath)

      if (!this.isPathAllowed(absolutePath, context.permissions)) {
        return {
          toolCallId: '',
          name: this.name,
          result: null,
          error: 'Access denied: path is blocked by permissions',
          durationMs: 0
        }
      }

      const entries = await fs.readdir(absolutePath, { withFileTypes: true })

      const list = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(absolutePath, entry.name)
          let size = 0
          try {
            const stat = await fs.stat(fullPath)
            size = stat.size
          } catch {
            // ignore stat errors for individual entries
          }
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            path: fullPath,
            size
          }
        })
      )

      return {
        toolCallId: '',
        name: this.name,
        result: { path: absolutePath, entries: list },
        durationMs: 0
      }
    } catch (error) {
      return {
        toolCallId: '',
        name: this.name,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to list files',
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
