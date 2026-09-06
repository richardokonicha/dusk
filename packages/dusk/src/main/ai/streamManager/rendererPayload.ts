import { projectMessagePartsForRenderer, projectStreamChunkForRenderer } from '@main/utils/messageOutputProjection'
import type { StreamChunkPayload } from '@shared/ai/transport'
import type { DuskUIMessage } from '@shared/data/types/message'

export function projectStreamMessageForRenderer(topicId: string, message: DuskUIMessage): DuskUIMessage {
  const parts = projectMessagePartsForRenderer(message.parts, topicId, message.id)
  return parts === message.parts ? message : ({ ...message, parts } as DuskUIMessage)
}

export function projectStreamChunkPayloadForRenderer(payload: StreamChunkPayload): StreamChunkPayload {
  const chunk = projectStreamChunkForRenderer(payload.chunk, payload.topicId, payload.anchorMessageId)
  return chunk === payload.chunk ? payload : { ...payload, chunk }
}
