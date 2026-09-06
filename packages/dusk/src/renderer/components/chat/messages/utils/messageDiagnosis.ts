import type { DuskMessagePart } from '@shared/data/types/message'
import type { DiagnosisResult } from '@shared/data/types/uiParts'
import { withDuskMeta } from '@shared/data/types/uiParts'

const MESSAGE_PART_ID_PATTERN = /^(.+)-(?:part|block)-(\d+)$/

export function parseMessagePartId(partId: string): { messageId: string; partIndex: number } | null {
  const match = partId.match(MESSAGE_PART_ID_PATTERN)
  if (!match) return null

  return { messageId: match[1], partIndex: Number.parseInt(match[2], 10) }
}

export function withMessagePartDiagnosis(
  parts: DuskMessagePart[],
  partIndex: number,
  diagnosis: DiagnosisResult
): DuskMessagePart[] | null {
  if (partIndex < 0 || partIndex >= parts.length) return null

  // The switch-narrowing at the call site can't reach here, so narrow to the
  // data-error part shape `withDuskMeta` type-checks the `diagnosis` field against.
  const target = parts[partIndex] as Extract<DuskMessagePart, { type: 'data-error' }>
  const updatedPart = withDuskMeta(target, { diagnosis })

  return parts.map((part, index) => (index === partIndex ? updatedPart : part))
}
