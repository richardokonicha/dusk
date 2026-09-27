// Load the sibling so it self-registers in the data-service registry (prod loads it via its DataApi handler).
import '@data/services/ProviderRegistryService'

import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import { ErrorCode } from '@shared/data/api/errors'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

// Stub the registry loader so the preset lookup returns a minimal new-api row
// (its endpoints tagged `newapi`) without reading the shipped providers.json,
// whose path is mocked away in the test harness.
vi.mock('@dusk/provider-registry/node', () => {
  class RegistryLoader {
    findProvider(providerId: string) {
      return this.loadProviders().find((p: any) => p.id === providerId) ?? null
    }
    loadProviders() {
      return [
        {
          id: 'new-api',
          endpointConfigs: {
            'google-generate-content': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' },
            'openai-responses': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' },
            'openai-chat-completions': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' }
          },
          defaultChatEndpoint: 'openai-chat-completions'
        }
      ]
    }
    loadModels() {
      return []
    }
    loadProviderModels() {
      return []
    }
    findModel() {
      return null
    }
    findOverride() {
      return null
    }
  }
  return { RegistryLoader }
})

describe('ProviderService.create — endpoint config overrides', () => {
  const dbh = setupTestDatabase()

  it.each([
    { providerId: 'github', presetProviderId: undefined },
    { providerId: 'github-copy', presetProviderId: 'github' }
  ])('rejects creation of a retired provider identity ($providerId)', ({ providerId, presetProviderId }) => {
    expect(() =>
      providerService.create({
        providerId,
        presetProviderId,
        name: 'Retired GitHub Models'
      })
    ).toThrowError(expect.objectContaining({ code: ErrorCode.INVALID_OPERATION }))
  })

  it('resolves adapterFamily from the preset for a preset-derived instance (custom gateway host)', async () => {
    // Mirrors the "add gateway instance" flow: user-entered baseUrls only, no
    // adapterFamily. Without read-time resolution the gemini endpoint resolves
    // to openai-compatible and image generation POSTs to /v1/images/generations.
    const created = providerService.create({
      providerId: 'newapi-express',
      presetProviderId: 'new-api',
      name: 'New API Express',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://relay.example.com' },
        [ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]: { baseUrl: 'https://relay.example.com/v1beta' },
        [ENDPOINT_TYPE.OPENAI_RESPONSES]: { baseUrl: 'https://relay.example.com' }
      }
    })

    // baseUrls are preserved; adapterFamily is derived.
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      baseUrl: 'https://relay.example.com/v1beta',
      adapterFamily: 'newapi'
    })
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('newapi')
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_RESPONSES]?.adapterFamily).toBe('newapi')

    // The row persists only the user-owned override shape — adapterFamily is
    // registry-owned and supplied at read time, never frozen into the row.
    const [row] = await dbh.db
      .select()
      .from(userProviderTable)
      .where(eq(userProviderTable.providerId, 'newapi-express'))
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      baseUrl: 'https://relay.example.com/v1beta'
    })
    expect(row.defaultChatEndpoint).toBeNull()
  })

  it('defaults endpoint families for a preset-less custom provider', async () => {
    const created = providerService.create({
      providerId: 'custom-relay',
      name: 'Custom Relay',
      defaultChatEndpoint: ENDPOINT_TYPE.ANTHROPIC_MESSAGES,
      endpointConfigs: {
        [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://relay.example.com' },
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://relay.example.com' }
      }
    })

    // No preset → endpoint-type defaults for both public baseUrl-only writes.
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]?.adapterFamily).toBe('anthropic')
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('openai-compatible')
  })
})
