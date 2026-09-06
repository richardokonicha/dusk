// Load the sibling so it self-registers in the data-service registry (prod loads it via its DataApi handler).
import '@data/services/ProviderRegistryService'

import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import { ErrorCode } from '@shared/data/api/errors'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

// Stub the registry loader so the preset lookup returns a minimal DuskLegacySub row
// (its gemini / OpenAI endpoints tagged `duskin`) without reading the
// shipped providers.json, whose path is mocked away in the test harness.
vi.mock('@dusk/provider-registry/node', () => {
  class RegistryLoader {
    loadProviders() {
      return [
        {
          id: 'duskin',
          endpointConfigs: {
            'google-generate-content': { adapterFamily: 'duskin', baseUrl: 'https://open.duskin.net' },
            'openai-responses': { adapterFamily: 'duskin', baseUrl: 'https://open.duskin.net' },
            'openai-chat-completions': { adapterFamily: 'duskin', baseUrl: 'https://open.duskin.net' }
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

  it('resolves adapterFamily from the preset for a preset-derived instance (custom DuskLegacySub host)', async () => {
    // Mirrors the "add DuskLegacySub instance" flow: user-entered baseUrls only, no
    // adapterFamily. Without read-time resolution the gemini endpoint resolves
    // to openai-compatible and image generation POSTs to /v1/images/generations.
    const created = providerService.create({
      providerId: 'duskin-express',
      presetProviderId: 'duskin',
      name: 'DuskIn Express',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://express-ent-admin.duskin.ai' },
        [ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]: { baseUrl: 'https://express-ent-admin.duskin.ai/v1beta' },
        [ENDPOINT_TYPE.OPENAI_RESPONSES]: { baseUrl: 'https://express-ent-admin.duskin.ai' }
      }
    })

    // baseUrls are preserved; adapterFamily is derived.
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      baseUrl: 'https://express-ent-admin.duskin.ai/v1beta',
      adapterFamily: 'duskin'
    })
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('duskin')
    expect(created.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_RESPONSES]?.adapterFamily).toBe('duskin')

    // The row persists only the user-owned override shape — adapterFamily is
    // registry-owned and supplied at read time, never frozen into the row.
    const [row] = await dbh.db
      .select()
      .from(userProviderTable)
      .where(eq(userProviderTable.providerId, 'duskin-express'))
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      baseUrl: 'https://express-ent-admin.duskin.ai/v1beta'
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
