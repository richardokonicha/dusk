import { describe, expect, it, vi } from 'vitest'

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
  }
}))

vi.mock('@main/core/lifecycle', () => ({
  BaseService: class {},
  Injectable: () => (target: unknown) => target,
  ServicePhase: () => (target: unknown) => target,
  Phase: { WhenReady: 'whenReady' }
}))

vi.mock('@main/services/RegionService', () => ({ regionService: { getCountry: vi.fn() } }))
vi.mock('@main/utils/systemInfo', () => ({ generateUserAgent: () => 'test-ua' }))
vi.mock('@main/data/services/ProviderRegistryService', () => ({
  providerRegistryService: { getCatalogVersion: vi.fn() }
}))
vi.mock('@main/data/dataApiDataChange', () => ({ notifyDataApiDataChange: vi.fn() }))
vi.mock('@main/data/services/utils/registryDataPaths', () => ({
  readActiveOverrideManifest: vi.fn()
}))
vi.mock('@main/services/providerRegistrySnapshot', () => ({
  writeProviderRegistrySnapshot: vi.fn()
}))

import { ProviderRegistryUpdaterService } from '../ProviderRegistryUpdaterService'

describe('ProviderRegistryUpdaterService.check', () => {
  it('is a no-op now that remote provider-registry updates are disabled', async () => {
    const service = new ProviderRegistryUpdaterService()
    await expect(service.check()).resolves.toBeUndefined()
  })
})
