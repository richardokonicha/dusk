// Load the sibling so it self-registers in the data-service registry (prod loads it via its DataApi handler).
import '@data/services/ProviderRegistryService'

import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

// Stub the registry loader so the preset lookup returns a minimal new-api row
// (its anthropic / gemini / OpenAI endpoints tagged `newapi`) without
// reading the shipped providers.json, whose path is mocked away in the harness.
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
            'anthropic-messages': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' },
            'google-generate-content': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' },
            'openai-responses': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' },
            'openai-chat-completions': { adapterFamily: 'newapi', baseUrl: 'http://localhost:3000' }
          }
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

describe('ProviderService.update — endpoint config overrides', () => {
  const dbh = setupTestDatabase()

  it('strips legacy reasoningFormatType from persisted endpoint configs on read', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'legacy-reasoning-format',
      name: 'Legacy Reasoning Format',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://proxy.example/v1',
          adapterFamily: 'openai',
          reasoningFormatType: 'openai-responses'
        }
      } as never,
      orderKey: 'a0'
    })

    const provider = providerService.getByProviderId('legacy-reasoning-format')
    const endpointConfig = provider.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]

    expect(endpointConfig).toEqual({
      baseUrl: 'https://proxy.example/v1',
      adapterFamily: 'openai'
    })
    expect(endpointConfig).not.toHaveProperty('reasoningFormatType')
  })

  it('persists a { baseUrl }-only override when a settings PATCH adds an endpoint', async () => {
    // A correctly-created preset-derived instance (openai-chat tagged `newapi`).
    providerService.create({
      providerId: 'newapi-express',
      presetProviderId: 'new-api',
      name: 'New API Express',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://relay.example.com' }
      }
    })

    // The "add endpoint" drawer PATCHes the public baseUrl-only shape.
    providerService.update('newapi-express', {
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://relay.example.com'
        },
        [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: { baseUrl: 'https://relay.example.com/v1' }
      }
    })

    const [row] = await dbh.db
      .select()
      .from(userProviderTable)
      .where(eq(userProviderTable.providerId, 'newapi-express'))

    // Rows persist only the user-owned override shape — the echoed
    // adapterFamily is stripped for preset-linked providers.
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]).toEqual({
      baseUrl: 'https://relay.example.com/v1'
    })
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]).toEqual({
      baseUrl: 'https://relay.example.com'
    })
    // The runtime read supplies the preset family for the newly-added
    // endpoint instead of the openai-compatible fallback.
    const runtime = providerService.getByProviderId('newapi-express')
    expect(runtime.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]?.adapterFamily).toBe('newapi')
    expect(runtime.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('newapi')
  })

  it('preserves a main-only legacy adapterFamily when a custom provider baseUrl is updated', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'custom-newapi-relay',
      name: 'Custom NewAPI Relay',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://old-relay.example.com',
          adapterFamily: 'newapi'
        }
      },
      orderKey: 'a0'
    })

    providerService.update('custom-newapi-relay', {
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://new-relay.example.com' }
      }
    })

    const [row] = await dbh.db
      .select()
      .from(userProviderTable)
      .where(eq(userProviderTable.providerId, 'custom-newapi-relay'))
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]).toEqual({
      baseUrl: 'https://new-relay.example.com',
      adapterFamily: 'newapi'
    })
    const runtime = providerService.getByProviderId('custom-newapi-relay')
    expect(runtime.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.adapterFamily).toBe('newapi')
  })

  it('uses the preset adapter family when adding the Responses endpoint', async () => {
    providerService.create({
      providerId: 'newapi-express-2',
      presetProviderId: 'new-api',
      name: 'New API Express 2',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://relay.example.com' }
      }
    })

    providerService.update('newapi-express-2', {
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_RESPONSES]: { baseUrl: 'https://relay.example.com' }
      }
    })

    const [row] = await dbh.db
      .select()
      .from(userProviderTable)
      .where(eq(userProviderTable.providerId, 'newapi-express-2'))
    expect(row.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_RESPONSES]).toEqual({
      baseUrl: 'https://relay.example.com'
    })
    const runtime = providerService.getByProviderId('newapi-express-2')
    expect(runtime.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_RESPONSES]?.adapterFamily).toBe('newapi')
  })
})
