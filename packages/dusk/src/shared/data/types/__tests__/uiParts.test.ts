import type { ReasoningUIPart, TextUIPart } from 'ai'
import { describe, expect, it } from 'vitest'

import type { DuskMessagePart } from '../message'
import {
  createClearContextPart,
  type DiagnosisResult,
  DuskErrorMetaSchema,
  DuskFileMetaSchema,
  DuskReasoningMetaSchema,
  DuskTextMetaSchema,
  DuskToolMetaSchema,
  getKnowledgeBaseIdsFromParts,
  hasClearContextPart,
  isBlankUserTurn,
  KnowledgeScopePartDataSchema,
  readDuskMeta,
  withDuskMeta,
  withKnowledgeScopePart
} from '../uiParts'

const diagnosis: DiagnosisResult = {
  summary: 'OpenAI API key is invalid',
  category: 'auth',
  explanation: 'The server rejected the request because the key is invalid.',
  steps: [{ text: 'Open provider settings and check the key' }]
}

function dataErrorPart(dusk?: Record<string, unknown>): Extract<DuskMessagePart, { type: 'data-error' }> {
  return {
    type: 'data-error',
    data: { name: 'AuthError', message: 'Unauthorized' },
    ...(dusk ? { providerMetadata: { dusk } } : {})
  } as unknown as Extract<DuskMessagePart, { type: 'data-error' }>
}

// ============================================================================
// Schema sanity — declared shape matches expectation
// ============================================================================

describe('DuskTextMetaSchema', () => {
  it('accepts references as array of anything', () => {
    expect(DuskTextMetaSchema.safeParse({ references: [{ category: 'citation' }] }).success).toBe(true)
    expect(DuskTextMetaSchema.safeParse({}).success).toBe(true)
  })
  it('rejects references that is not an array', () => {
    expect(DuskTextMetaSchema.safeParse({ references: 'not-an-array' }).success).toBe(false)
  })
})

describe('DuskReasoningMetaSchema', () => {
  it('accepts thinkingMs as number', () => {
    expect(DuskReasoningMetaSchema.safeParse({ thinkingMs: 1234 }).success).toBe(true)
  })
  it('accepts startedAt as number', () => {
    expect(DuskReasoningMetaSchema.safeParse({ startedAt: 1780913860106 }).success).toBe(true)
  })
  it('rejects thinkingMs that is not a number', () => {
    expect(DuskReasoningMetaSchema.safeParse({ thinkingMs: '1234' }).success).toBe(false)
  })
})

describe('DuskToolMetaSchema', () => {
  it('accepts transport/toolName/tool', () => {
    const ok = DuskToolMetaSchema.safeParse({
      transport: 'claude-agent',
      toolName: 'web_search',
      tool: { serverId: 's1', serverName: 'search', type: 'mcp' }
    })
    expect(ok.success).toBe(true)
  })
  it('rejects tool.type outside the enum', () => {
    const bad = DuskToolMetaSchema.safeParse({ tool: { type: 'pluggable' } })
    expect(bad.success).toBe(false)
  })
})

describe('DuskFileMetaSchema', () => {
  it('accepts fileEntryId, fileTokenSourceId, and the safe composer file kind', () => {
    const ok = DuskFileMetaSchema.safeParse({
      fileEntryId: 'entry-1',
      fileTokenSourceId: 'source-1',
      composerFileKind: 'pasted-text'
    })

    expect(ok.success).toBe(true)
  })

  it('rejects non-string fileTokenSourceId', () => {
    const bad = DuskFileMetaSchema.safeParse({ fileTokenSourceId: 1 })

    expect(bad.success).toBe(false)
  })

  it('rejects unsupported composer file kinds', () => {
    const bad = DuskFileMetaSchema.safeParse({ composerFileKind: 'local-path' })

    expect(bad.success).toBe(false)
  })
})

describe('DuskErrorMetaSchema', () => {
  it('accepts a fully-formed diagnosis and an empty object', () => {
    expect(DuskErrorMetaSchema.safeParse({ diagnosis }).success).toBe(true)
    expect(DuskErrorMetaSchema.safeParse({}).success).toBe(true)
  })

  it('rejects a diagnosis with a non-string summary', () => {
    expect(DuskErrorMetaSchema.safeParse({ diagnosis: { ...diagnosis, summary: 42 } }).success).toBe(false)
  })

  it('rejects a diagnosis whose steps are not step objects', () => {
    expect(DuskErrorMetaSchema.safeParse({ diagnosis: { ...diagnosis, steps: ['plain'] } }).success).toBe(false)
  })
})

describe('knowledge scope parts', () => {
  it('validates, deduplicates, and replaces the aggregate scope part', () => {
    const parts = withKnowledgeScopePart(
      [
        { type: 'text', text: 'hello' },
        { type: 'data-knowledge-scope', data: { baseIds: ['old'] } }
      ] as DuskMessagePart[],
      ['kb-1', 'kb-2', 'kb-1']
    )

    expect(parts).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'data-knowledge-scope', data: { baseIds: ['kb-1', 'kb-2'] } }
    ])
    expect(getKnowledgeBaseIdsFromParts(parts)).toEqual(['kb-1', 'kb-2'])
  })

  it('removes the scope part when the selection is empty', () => {
    const parts = withKnowledgeScopePart(
      [
        { type: 'text', text: 'hello' },
        { type: 'data-knowledge-scope', data: { baseIds: ['kb-1'] } }
      ] as DuskMessagePart[],
      []
    )

    expect(parts).toEqual([{ type: 'text', text: 'hello' }])
    expect(getKnowledgeBaseIdsFromParts(parts)).toBeUndefined()
  })

  it('rejects malformed scope data at the read boundary', () => {
    expect(KnowledgeScopePartDataSchema.safeParse({ baseIds: [''] }).success).toBe(false)
    expect(
      getKnowledgeBaseIdsFromParts([
        { type: 'data-knowledge-scope', data: { baseIds: [42] } } as unknown as DuskMessagePart
      ])
    ).toBeUndefined()
  })
})

describe('clear context parts', () => {
  it('creates and detects a hidden data UI part', () => {
    const part = createClearContextPart()

    expect(part).toEqual({ type: 'data-clear', data: {} })
    expect(hasClearContextPart([{ type: 'text', text: 'before' }, part])).toBe(true)
    expect(hasClearContextPart([{ type: 'text', text: 'before' }])).toBe(false)
    expect(hasClearContextPart(undefined)).toBe(false)
  })
})

describe('blank user turns', () => {
  it('requires a successful user role with no parts', () => {
    expect(isBlankUserTurn({ role: 'user', status: 'success', parts: [] })).toBe(true)
    expect(isBlankUserTurn({ role: 'assistant', status: 'success', parts: [] })).toBe(false)
    expect(isBlankUserTurn({ role: 'user', status: 'pending', parts: [] })).toBe(false)
    expect(isBlankUserTurn({ role: 'user', status: 'success', parts: [{ type: 'text' }] })).toBe(false)
  })
})

// ============================================================================
// readDuskMeta — runtime validation + narrowing
// ============================================================================

describe('readDuskMeta', () => {
  it('reads DuskTextMeta from a TextUIPart with references', () => {
    const part: TextUIPart = {
      type: 'text',
      text: 'hi',
      providerMetadata: { dusk: { references: [{ category: 'citation' }] } }
    }
    const meta = readDuskMeta(part)
    expect(meta?.references).toEqual([{ category: 'citation' }])
  })

  it('reads DuskReasoningMeta from a ReasoningUIPart with thinking metadata', () => {
    const part: ReasoningUIPart = {
      type: 'reasoning',
      text: 'thinking...',
      providerMetadata: { dusk: { thinkingMs: 5000, startedAt: 1780913860106 } }
    }
    const meta = readDuskMeta(part)
    expect(meta?.thinkingMs).toBe(5000)
    expect(meta?.startedAt).toBe(1780913860106)
  })

  it('reads DuskToolMeta from a tool-foo part with transport and tool', () => {
    const part = {
      type: 'tool-fetch_url',
      toolCallId: 'tc1',
      providerMetadata: {
        dusk: { transport: 'claude-agent', tool: { serverId: 's1', type: 'mcp' as const } }
      }
    } as unknown as DuskMessagePart
    const meta = readDuskMeta(part)
    expect(meta).toEqual({
      transport: 'claude-agent',
      tool: { serverId: 's1', type: 'mcp' }
    })
  })

  it('reads DuskToolMeta from a dynamic-tool part', () => {
    const part = {
      type: 'dynamic-tool',
      toolName: 'x',
      toolCallId: 'tc2',
      providerMetadata: { dusk: { transport: 'claude-agent' } }
    } as unknown as Extract<DuskMessagePart, { type: 'dynamic-tool' }>
    expect(readDuskMeta(part)?.transport).toBe('claude-agent')
  })

  it('reads DuskFileMeta from a file part with token source id', () => {
    const part = {
      type: 'file',
      mediaType: 'application/pdf',
      url: 'file:///tmp/report.pdf',
      filename: 'report.pdf',
      providerMetadata: {
        dusk: { fileEntryId: 'entry-1', fileTokenSourceId: 'source-1', composerFileKind: 'pasted-text' }
      }
    } as unknown as Extract<DuskMessagePart, { type: 'file' }>

    expect(readDuskMeta(part)).toEqual({
      fileEntryId: 'entry-1',
      fileTokenSourceId: 'source-1',
      composerFileKind: 'pasted-text'
    })
  })

  it('reads DuskErrorMeta diagnosis from a data-error part', () => {
    expect(readDuskMeta(dataErrorPart({ diagnosis }))?.diagnosis).toEqual(diagnosis)
  })

  it('returns undefined for a data-error part with a malformed diagnosis', () => {
    expect(readDuskMeta(dataErrorPart({ diagnosis: { summary: 42 } }))).toBeUndefined()
  })

  it('returns undefined when providerMetadata is missing', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    expect(readDuskMeta(part)).toBeUndefined()
  })

  it('returns undefined when dusk is missing', () => {
    const part: TextUIPart = { type: 'text', text: '', providerMetadata: {} }
    expect(readDuskMeta(part)).toBeUndefined()
  })

  it('returns undefined when dusk is not an object', () => {
    const part = {
      type: 'text',
      text: '',
      providerMetadata: { dusk: 'oops' }
    } as unknown as TextUIPart
    expect(readDuskMeta(part)).toBeUndefined()
  })

  it('returns undefined for a part type without a registered schema', () => {
    const part = {
      type: 'data-translation',
      data: { content: 'x', targetLanguage: 'en' },
      providerMetadata: { dusk: { references: [] } }
    } as unknown as DuskMessagePart
    expect(readDuskMeta(part)).toBeUndefined()
  })

  it('returns undefined when references is the wrong shape', () => {
    const part = {
      type: 'text',
      text: '',
      providerMetadata: { dusk: { references: 'oops' } }
    } as unknown as TextUIPart
    expect(readDuskMeta(part)).toBeUndefined()
  })

  it('returns undefined when thinkingMs is the wrong shape', () => {
    const part = {
      type: 'reasoning',
      text: '',
      providerMetadata: { dusk: { thinkingMs: 'oops' } }
    } as unknown as ReasoningUIPart
    expect(readDuskMeta(part)).toBeUndefined()
  })
})

// ============================================================================
// withDuskMeta — typed write boundary
// ============================================================================

describe('withDuskMeta', () => {
  it('writes references onto a TextUIPart', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    const next = withDuskMeta(part, { references: [{ url: 'https://ex.com' }] })
    expect(next.providerMetadata?.dusk).toEqual({ references: [{ url: 'https://ex.com' }] })
  })

  it('preserves existing dusk fields when merging', () => {
    const part: TextUIPart = {
      type: 'text',
      text: '',
      providerMetadata: { dusk: { references: [{ a: 1 }] } }
    }
    const next = withDuskMeta(part, { references: [{ b: 2 }] })
    // shallow merge: new patch overwrites the same key
    expect(next.providerMetadata?.dusk).toEqual({ references: [{ b: 2 }] })
  })

  it('writes thinking metadata onto a ReasoningUIPart', () => {
    const part: ReasoningUIPart = { type: 'reasoning', text: '' }
    const next = withDuskMeta(part, { thinkingMs: 1234, startedAt: 1780913860106 })
    expect(next.providerMetadata?.dusk).toEqual({ thinkingMs: 1234, startedAt: 1780913860106 })
  })

  it('writes fileTokenSourceId onto a FileUIPart', () => {
    const part = {
      type: 'file',
      mediaType: 'application/pdf',
      url: 'file:///tmp/report.pdf',
      filename: 'report.pdf'
    } as unknown as Extract<DuskMessagePart, { type: 'file' }>
    const next = withDuskMeta(part, { fileTokenSourceId: 'source-1' })

    expect(next.providerMetadata?.dusk).toEqual({ fileTokenSourceId: 'source-1' })
  })

  it('round-trips a diagnosis onto a data-error part', () => {
    const next = withDuskMeta(dataErrorPart(), { diagnosis })
    expect(readDuskMeta(next)?.diagnosis).toEqual(diagnosis)
  })

  // ── Compile-time negatives — `tsc --noEmit` enforces these. ──────────
  it('rejects writing thinkingMs to TextUIPart at compile time', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    // @ts-expect-error thinkingMs is not on DuskTextMeta
    withDuskMeta(part, { thinkingMs: 1 })
    expect(true).toBe(true)
  })

  it('rejects writing references to ReasoningUIPart at compile time', () => {
    const part: ReasoningUIPart = { type: 'reasoning', text: '' }
    // @ts-expect-error references is not on DuskReasoningMeta
    withDuskMeta(part, { references: [] })
    expect(true).toBe(true)
  })

  it('rejects writing transport to TextUIPart at compile time', () => {
    const part: TextUIPart = { type: 'text', text: '' }
    // @ts-expect-error transport is not on DuskTextMeta
    withDuskMeta(part, { transport: 'x' })
    expect(true).toBe(true)
  })
})
