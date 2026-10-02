import { type Model, MODEL_CAPABILITY } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import { finalizeWebToolRoutes } from '@shared/utils/provider'
import { describe, expect, it } from 'vitest'

const model = (apiModelId: string, overrides: Partial<Model> = {}): Model => ({
  id: `provider::${apiModelId}`,
  providerId: 'provider',
  apiModelId,
  name: apiModelId,
  capabilities: [],
  supportsStreaming: true,
  isEnabled: true,
  isHidden: false,
  ...overrides
})

describe('finalizeWebToolRoutes', () => {
  const gemini25 = model('gemini-2.5-pro', { capabilities: [MODEL_CAPABILITY.FUNCTION_CALL] })
  const gemini3 = model('gemini-3-1-pro-preview', { capabilities: [MODEL_CAPABILITY.FUNCTION_CALL] })
  const geminiProvider = { id: 'gemini', serverTools: [] } as unknown as Provider
  const openrouterLike = { id: 'openrouter', serverTools: [] } as unknown as Provider

  it('withdraws surviving server routes for pre-3 Gemini once real function tools are known', () => {
    expect(finalizeWebToolRoutes({ webSearch: 'server', webFetch: 'server' }, gemini25, geminiProvider, true)).toEqual({
      webSearch: 'none',
      webFetch: 'none',
      reasons: { webSearch: 'gemini-function-tool-conflict', webFetch: 'gemini-function-tool-conflict' }
    })
  })

  it('spares non-google server search implementations', () => {
    expect(finalizeWebToolRoutes({ webSearch: 'server', webFetch: 'none' }, gemini25, openrouterLike, true)).toEqual({
      webSearch: 'server',
      webFetch: 'none'
    })
  })

  it('keeps routes untouched without a conflict', () => {
    const routes = { webSearch: 'server', webFetch: 'server' } as const
    expect(finalizeWebToolRoutes(routes, gemini25, geminiProvider, false)).toBe(routes)
    expect(finalizeWebToolRoutes(routes, gemini3, geminiProvider, true)).toBe(routes)
    const clientRoutes = { webSearch: 'client', webFetch: 'client' } as const
    expect(finalizeWebToolRoutes(clientRoutes, gemini25, geminiProvider, true)).toBe(clientRoutes)
  })
})
