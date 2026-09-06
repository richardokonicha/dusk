import type * as NodeFs from 'node:fs'

import { app } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn()
}))

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof NodeFs>()),
  readFileSync: readFileSyncMock
}))

const setPackaged = (value: boolean) => {
  ;(app as { isPackaged: boolean }).isPackaged = value
}

const loadGetAppEdition = async () => (await import('../appEdition')).getAppEdition

describe('getAppEdition', () => {
  beforeEach(() => {
    vi.resetModules()
    readFileSyncMock.mockReset()
    setPackaged(false)
    vi.stubEnv('DUSK_EDITION', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['legacy package metadata', {}, 'global'],
    ['global package metadata', { edition: 'global' }, 'global'],
    ['China package metadata', { edition: 'cn' }, 'cn']
  ])('reads %s', async (_label, packageMetadata, expected) => {
    readFileSyncMock.mockReturnValue(JSON.stringify(packageMetadata))

    const getAppEdition = await loadGetAppEdition()
    expect(getAppEdition()).toBe(expected)
  })

  it('uses the development edition override', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ edition: 'global' }))
    vi.stubEnv('DUSK_EDITION', 'cn')

    const getAppEdition = await loadGetAppEdition()
    expect(getAppEdition()).toBe('cn')
  })

  it('ignores the development override in packaged builds', async () => {
    setPackaged(true)
    readFileSyncMock.mockReturnValue(JSON.stringify({ edition: 'global' }))
    vi.stubEnv('DUSK_EDITION', 'cn')

    const getAppEdition = await loadGetAppEdition()
    expect(getAppEdition()).toBe('global')
  })

  it('rejects an unsupported development edition', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ edition: 'global' }))
    vi.stubEnv('DUSK_EDITION', 'enterprise')

    const getAppEdition = await loadGetAppEdition()
    expect(() => getAppEdition()).toThrow('Unsupported application edition: enterprise')
  })

  it('rejects an unsupported package edition', async () => {
    setPackaged(true)
    readFileSyncMock.mockReturnValue(JSON.stringify({ edition: 'enterprise' }))

    const getAppEdition = await loadGetAppEdition()
    expect(() => getAppEdition()).toThrow('Unsupported application edition: enterprise')
  })
})
