import { beforeEach, describe, expect, it, vi } from 'vitest'

const { proxyState } = vi.hoisted(() => ({
  proxyState: { appliedProxyKey: 'direct||' as string | null }
}))

vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })
  }
}))

vi.mock('@application', async () => {
  const { mockApplicationFactory } = await import('@test-mocks/main/application')
  const result = mockApplicationFactory()
  const originalGet = result.application.get.getMockImplementation()!
  result.application.get.mockImplementation((name: string) => {
    if (name === 'ProxyService') {
      return {
        get appliedProxyKey() {
          return proxyState.appliedProxyKey
        }
      }
    }
    return originalGet(name)
  })
  return result
})

import { MockMainCacheServiceUtils } from '@test-mocks/main/CacheService'

import { regionService } from '../RegionService'

describe('RegionService', () => {
  beforeEach(() => {
    MockMainCacheServiceUtils.resetMocks()
  })

  it('returns the static default country', async () => {
    await expect(regionService.getCountry()).resolves.toBe('US')
  })

  it('reports isInChina as false for the static default', async () => {
    await expect(regionService.isInChina()).resolves.toBe(false)
  })

  it('always returns the same value on repeated calls', async () => {
    await expect(regionService.getCountry()).resolves.toBe('US')
    await expect(regionService.getCountry()).resolves.toBe('US')
  })
})
