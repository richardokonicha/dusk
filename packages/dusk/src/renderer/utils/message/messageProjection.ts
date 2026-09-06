import {
  type BranchMessage,
  type DuskMessagePart,
  type DuskUIMessage,
  type Message as SharedMessage,
  toContentRole
} from '@shared/data/types/message'
import { isBlankUserTurn } from '@shared/data/types/uiParts'

export function sharedMessageToUIMessage(shared: SharedMessage): DuskUIMessage {
  return {
    id: shared.id,
    role: toContentRole(shared.role),
    parts: (shared.data?.parts ?? []) as DuskUIMessage['parts'],
    metadata: {
      parentId: shared.parentId,
      siblingsGroupId: shared.siblingsGroupId || undefined,
      modelId: shared.modelId ?? undefined,
      messageSnapshot: shared.messageSnapshot ?? undefined,
      status: shared.status,
      turnOptions: shared.data.turnOptions,
      createdAt: shared.createdAt,
      stats: shared.stats ?? undefined,
      ...(shared.stats?.totalTokens ? { totalTokens: shared.stats.totalTokens } : {})
    }
  }
}

export function isRenderableConversationMessage(message: DuskUIMessage): boolean {
  return !isBlankUserTurn({ role: message.role, status: message.metadata?.status, parts: message.parts })
}

export function uiMessagesToPartsMap(messages: DuskUIMessage[]): Record<string, DuskMessagePart[]> {
  const map: Record<string, DuskMessagePart[]> = {}
  for (const message of messages) {
    if (message.parts.length > 0) {
      map[message.id] = message.parts
    }
  }
  return map
}

export function branchMessagesToFullUIMessages(branchItems: BranchMessage[]): DuskUIMessage[] {
  const messages: DuskUIMessage[] = []
  const seen = new Set<string>()

  const pushMessage = (message: SharedMessage) => {
    if (seen.has(message.id)) return
    seen.add(message.id)
    messages.push(sharedMessageToUIMessage(message))
  }

  for (const item of branchItems) {
    if (!item.siblingsGroup?.length) {
      pushMessage(item.message)
      continue
    }

    const group = [item.message, ...item.siblingsGroup].sort((a, b) => {
      const timeCompare = a.createdAt.localeCompare(b.createdAt)
      return timeCompare === 0 ? a.id.localeCompare(b.id) : timeCompare
    })
    group.forEach(pushMessage)
  }

  return messages
}
