// Load the sibling so it self-registers in the data-service registry (prod loads it via its DataApi handler).
import '@data/services/ProviderRegistryService'

import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import { resolveAiSdkProviderId } from '@main/ai/provider/endpoint'
import { ErrorCode } from '@shared/data/api/errors'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'

// Stub the registry loader with AcmeRelaySub plus a future `my-relay` preset.
// `google-generate-content` is deliberately present for AcmeRelaySub but ABSENT
// from the persisted rows below — modelling an install seeded before the
// registry gained that endpoint (#17096). `my-relay` models a later registry
// id collision with an already-persisted fully custom provider. AcmeRelaySub
// rides the `newapi` adapter family — a registered multi-endpoint gateway —
// so resolver assertions stay meaningful.
vi.mock('@dusk/provider-registry/node', () => {
  class RegistryLoader {
    findProvider(providerId: string) {
      return this.loadProviders().find((p: any) => p.id === providerId) ?? null
    }
    loadProviders() {
      return [
        {
          id: 'acme-relay',
          endpointConfigs: {
            'openai-chat-completions': {
              adapterFamily: 'newapi',
              baseUrl: 'https://api.acme-relay.net',
              modelsApiUrls: { default: 'https://api.acme-relay.net/v1/models' }
            },
            'openai-responses': { adapterFamily: 'newapi', baseUrl: 'https://api.acme-relay.net' },
            'google-generate-content': { adapterFamily: 'newapi', baseUrl: 'https://api.acme-relay.net' }
          },
          defaultChatEndpoint: 'openai-chat-completions',
          reportsActualCost: false,
          reportedCostCurrency: 'USD'
        },
        {
          id: 'my-relay',
          description: 'Future registry provider',
          endpointConfigs: {
            'openai-chat-completions': {
              adapterFamily: 'future-registry',
              baseUrl: 'https://registry.example/v1',
              modelsApiUrls: { default: 'https://registry.example/v1/models' }
            }
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

describe('ProviderService read-time registry merge (#17096)', () => {
  const dbh = setupTestDatabase()

  it('makes retired providers and their preset-derived copies unavailable to runtime reads and mutations', async () => {
    await dbh.db.insert(userProviderTable).values([
      {
        providerId: 'github',
        presetProviderId: 'github',
        name: 'GitHub Models',
        apiKeys: [{ id: 'github-key', key: 'secret', isEnabled: true }],
        orderKey: 'a0'
      },
      {
        providerId: 'github-copy',
        presetProviderId: 'github',
        name: 'GitHub Models Copy',
        apiKeys: [{ id: 'github-copy-key', key: 'copy-secret', isEnabled: true }],
        orderKey: 'a1'
      },
      {
        providerId: 'custom-relay',
        presetProviderId: null,
        name: 'Custom Relay',
        orderKey: 'a2'
      }
    ])

    expect(providerService.list({}).map((provider) => provider.id)).toEqual(['custom-relay'])
    expect(() => providerService.getByProviderId('github')).toThrowError(
      expect.objectContaining({ code: ErrorCode.NOT_FOUND })
    )
    expect(() => providerService.getByProviderId('github-copy')).toThrowError(
      expect.objectContaining({ code: ErrorCode.NOT_FOUND })
    )

    for (const { providerId, keyId } of [
      { providerId: 'github', keyId: 'github-key' },
      { providerId: 'github-copy', keyId: 'github-copy-key' }
    ]) {
      const operations = [
        () => providerService.update(providerId, { name: 'Still retired' }),
        () => providerService.resolveApiKey(providerId),
        () => providerService.getApiKeys(providerId),
        () => providerService.getAuthConfig(providerId),
        () => providerService.addApiKey(providerId, 'new-secret'),
        () =>
          providerService.replaceApiKeys(providerId, [
            { id: 'replacement-key', key: 'replacement-secret', isEnabled: true }
          ]),
        () => providerService.updateApiKey(providerId, keyId, { label: 'updated' }),
        () => providerService.deleteApiKey(providerId, keyId),
        () => providerService.delete(providerId)
      ]

      for (const operation of operations) {
        expect(operation).toThrowError(expect.objectContaining({ code: ErrorCode.NOT_FOUND }))
      }
    }
  })

  it('surfaces a registry-added endpoint type absent from the persisted row', async () => {
    // Stale seed: only openai-chat persisted; google-generate-content added to
    // the registry after this row was seeded.
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://api.acme-relay.net',
          adapterFamily: 'newapi'
        }
      },
      orderKey: 'a0'
    })

    const provider = providerService.getByProviderId('acme-relay')

    expect(provider.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]).toEqual({
      adapterFamily: 'newapi',
      baseUrl: 'https://api.acme-relay.net'
    })
    expect(provider.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_RESPONSES]).toEqual({
      adapterFamily: 'newapi',
      baseUrl: 'https://api.acme-relay.net'
    })
    // End to end: the resolver no longer falls through to openai-compatible.
    expect(resolveAiSdkProviderId(provider, ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT)).not.toBe('openai-compatible')
    expect(resolveAiSdkProviderId(provider, ENDPOINT_TYPE.OPENAI_RESPONSES)).toBe('newapi')
  })

  it('keeps the user-owned baseUrl while refreshing registry-owned fields', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://proxy.corp.example/v1', // user override
          adapterFamily: 'stale-family' // stale registry snapshot
        }
      },
      orderKey: 'a0'
    })

    const config =
      providerService.getByProviderId('acme-relay').endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]

    expect(config).toEqual({
      baseUrl: 'https://proxy.corp.example/v1', // row wins
      adapterFamily: 'newapi', // registry wins
      modelsApiUrls: { default: 'https://api.acme-relay.net/v1/models' } // registry wins
    })
  })

  it('keeps explicit custom provenance when a future registry entry reuses the provider id', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'my-relay',
      presetProviderId: null,
      name: 'My Relay',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://relay.example/v1',
          adapterFamily: 'newapi' // migrator-written hint must survive
        },
        [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: {
          baseUrl: 'https://relay.example' // no family → endpoint-type inference
        }
      },
      orderKey: 'a0'
    })

    const provider = providerService.getByProviderId('my-relay')
    const configs = provider.endpointConfigs

    expect(provider.description).toBeUndefined()
    expect(provider.defaultChatEndpoint).toBeUndefined()
    expect(configs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]).toEqual({
      baseUrl: 'https://relay.example/v1',
      adapterFamily: 'newapi'
    })
    expect(configs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]).toEqual({
      baseUrl: 'https://relay.example',
      adapterFamily: 'anthropic'
    })
  })

  it('resolves registry-owned request metadata when the row stores no delta', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      orderKey: 'a0'
    })

    const provider = providerService.getByProviderId('acme-relay')

    // Registry baseline over app defaults; nothing frozen in the row.
    expect(provider.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.dialect).toBeUndefined()
    expect(provider.defaultChatEndpoint).toBe(ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS)
    expect(provider.reportedCostCurrency).toBe('USD')
  })

  it('persists an endpoint dialect as a delta: deviations stick, registry echoes vanish', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      orderKey: 'a0'
    })
    const chat = ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS

    // A deviation from the registry (which declares no dialect, so developerRole defaults false).
    providerService.update('acme-relay', { endpointConfigs: { [chat]: { dialect: { developerRole: true } } } })
    let [row] = await dbh.db.select().from(userProviderTable).where(eq(userProviderTable.providerId, 'acme-relay'))
    expect(row.endpointConfigs?.[chat]?.dialect).toEqual({ developerRole: true })
    expect(providerService.getByProviderId('acme-relay').endpointConfigs?.[chat]?.dialect).toEqual({
      developerRole: true
    })

    // Echoing the registry's own value is not an override — the row keeps no dialect.
    providerService.update('acme-relay', { endpointConfigs: { [chat]: { dialect: { developerRole: false } } } })
    ;[row] = await dbh.db.select().from(userProviderTable).where(eq(userProviderTable.providerId, 'acme-relay'))
    expect(row.endpointConfigs?.[chat]?.dialect).toBeUndefined()
  })

  it('drops a defaultChatEndpoint echo that matches the registry baseline', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      orderKey: 'a0'
    })

    // The provider editor echoes the current runtime endpoint while renaming.
    // That baseline value must not become a stored override.
    providerService.update('acme-relay', {
      name: 'Renamed AcmeRelaySub',
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS
    })
    let [row] = await dbh.db.select().from(userProviderTable).where(eq(userProviderTable.providerId, 'acme-relay'))
    expect(row.defaultChatEndpoint).toBeNull()

    // A real user override persists, then disappears again when reset to the
    // registry baseline.
    providerService.update('acme-relay', {
      defaultChatEndpoint: ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT
    })
    ;[row] = await dbh.db.select().from(userProviderTable).where(eq(userProviderTable.providerId, 'acme-relay'))
    expect(row.defaultChatEndpoint).toBe(ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT)

    providerService.update('acme-relay', {
      defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS
    })
    ;[row] = await dbh.db.select().from(userProviderTable).where(eq(userProviderTable.providerId, 'acme-relay'))
    expect(row.defaultChatEndpoint).toBeNull()
  })

  it('drops endpoint baseUrls that match the registry default on write', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      orderKey: 'a0'
    })

    // Renderer echo of the merged snapshot: one registry-default baseUrl, one
    // genuine user override.
    providerService.update('acme-relay', {
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'https://api.acme-relay.net' },
        [ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]: { baseUrl: 'https://proxy.corp.example' }
      }
    })

    const [row] = await dbh.db.select().from(userProviderTable).where(eq(userProviderTable.providerId, 'acme-relay'))
    expect(row.endpointConfigs).toEqual({
      [ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]: { baseUrl: 'https://proxy.corp.example' }
    })
    // The runtime still sees both endpoints — the dropped one from the registry.
    const runtime = providerService.getByProviderId('acme-relay')
    expect(runtime.endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]?.baseUrl).toBe('https://api.acme-relay.net')
    expect(runtime.endpointConfigs?.[ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT]?.baseUrl).toBe('https://proxy.corp.example')
  })

  it('strips legacy registry-only fields before merging', async () => {
    await dbh.db.insert(userProviderTable).values({
      providerId: 'acme-relay',
      presetProviderId: 'acme-relay',
      name: 'AcmeRelaySub',
      endpointConfigs: {
        [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: {
          baseUrl: 'https://api.acme-relay.net',
          adapterFamily: 'acme-relay',
          reasoningFormatType: 'openai-responses'
        }
      } as never,
      orderKey: 'a0'
    })

    const config =
      providerService.getByProviderId('acme-relay').endpointConfigs?.[ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]
    expect(config).not.toHaveProperty('reasoningFormatType')
  })
})
