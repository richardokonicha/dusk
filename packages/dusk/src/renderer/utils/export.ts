import type { ExportableMessage } from '@renderer/types/messageExport'
import { markdownToPlainText } from '@renderer/utils/markdown'
import { getComposerTextFromMessage } from '@renderer/utils/message/composerTokens'
import { getNamingTextContent, getToolCitationExport } from '@renderer/utils/message/find'

/**
 * Extract title from message content, limit length and handle newlines and punctuation.
 * Used for export functionality.
 * @param {string} str Input string
 * @param {number} [length=80] Maximum title length, defaults to 80
 * @returns {string} Extracted title
 */
export function getTitleFromString(str: string, length: number = 80): string {
  let title = str.trimStart().split('\n')[0]

  if (title.includes('。')) {
    title = title.split('。')[0]
  } else if (title.includes('，')) {
    title = title.split('，')[0]
  } else if (title.includes('.')) {
    title = title.split('.')[0]
  } else if (title.includes(',')) {
    title = title.split(',')[0]
  }

  if (title.length > length) {
    title = title.slice(0, length)
  }

  if (!title) {
    title = str.slice(0, length)
  }

  return title
}

/**
 * Process citation markers in text
 * @param content Raw text content
 * @param mode Processing mode: 'remove' to remove citations, 'normalize' to standardize to Markdown format
 * @returns Processed text
 */
export const processCitations = (content: string, mode: 'remove' | 'normalize' = 'remove'): string => {
  // Use regex to match Markdown code blocks
  const codeBlockRegex = /(```[a-zA-Z]*\n[\s\S]*?\n```)/g
  const parts = content.split(codeBlockRegex)

  const processedParts = parts.map((part, index) => {
    // If code block (odd index), return as-is
    if (index % 2 === 1) {
      return part
    }

    let result = part

    if (mode === 'remove') {
      // Remove various forms of citation markers
      result = result
        .replace(/\[<sup[^>]*data-citation[^>]*>\d+<\/sup>\]\([^)]*\)/g, '')
        .replace(/\[<sup[^>]*>\d+<\/sup>\]\([^)]*\)/g, '')
        .replace(/<sup[^>]*data-citation[^>]*>\d+<\/sup>/g, '')
        .replace(/\[(\d+)\](?!\()/g, '')
    } else if (mode === 'normalize') {
      // Standardize citation format to Markdown footnote format
      result = result
        // Convert [<sup data-citation='...'>number</sup>](link) to [^number]
        .replace(/\[<sup[^>]*data-citation[^>]*>(\d+)<\/sup>\]\([^)]*\)/g, '[^$1]')
        // Convert [<sup>number</sup>](link) to [^number]
        .replace(/\[<sup[^>]*>(\d+)<\/sup>\]\([^)]*\)/g, '[^$1]')
        // Convert standalone <sup data-citation='...'>number</sup> to [^number]
        .replace(/<sup[^>]*data-citation[^>]*>(\d+)<\/sup>/g, '[^$1]')
        // Convert [number] to [^number] (careful not to convert other bracket content)
        .replace(/\[(\d+)\](?!\()/g, '[^$1]')
    }

    // Process by line, preserve Markdown structure
    const lines = result.split('\n')
    const processedLines = lines.map((line) => {
      // If blockquote or other special format, don't modify spacing
      if (line.match(/^>|^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s{4,}/)) {
        return line.replace(/[ ]+/g, ' ').replace(/[ ]+$/g, '')
      }
      // Regular text line, clean extra spaces but preserve basic format
      return line.replace(/[ ]+/g, ' ').trim()
    })

    return processedLines.join('\n')
  })

  return processedParts.join('').trim()
}

const formatMessageAsPlainText = (message: ExportableMessage): string => {
  // Assistant/agent rows lead with the frozen producing author (survives rename/delete), like the header.
  const author = 'messageSnapshot' in message ? message.messageSnapshot : undefined
  const roleText = message.role === 'user' ? 'User:' : `${author?.name ?? 'Assistant'}:`
  const plainTextContent = markdownToPlainText(copyableTextContent(message)).trim()
  return `${roleText}\n${plainTextContent}`
}

/**
 * The message text a copy yields. Uses the gated text (drops error/translation) so
 * copying an errored or translated message gives the clean answer, not an error
 * dump — full-fidelity export keeps `getMainTextContent` instead.
 *
 * `[cite:id]` markers are resolved to plain `[N]` before `markdownToPlainText`
 * runs: left in, `remove-markdown` mangles a chain of them down to a bare
 * `cite:<id>` and the internal id ends up on the clipboard.
 */
const copyableTextContent = (message: ExportableMessage): string => {
  const content = getComposerTextFromMessage(message, getNamingTextContent(message))
  return getToolCitationExport(message, content).content
}

export const messageToPlainText = (message: ExportableMessage): string => {
  return markdownToPlainText(copyableTextContent(message)).trim()
}

export const messagesToPlainText = (messages: ExportableMessage[]): string => {
  return messages.map(formatMessageAsPlainText).join('\n\n')
}
