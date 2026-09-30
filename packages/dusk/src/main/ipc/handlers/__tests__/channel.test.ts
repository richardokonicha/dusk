import { beforeEach, describe, expect, it, vi } from 'vitest'

const { appGetMock } = vi.hoisted(() => ({ appGetMock: vi.fn() }))

vi.mock('@application', () => ({ application: { get: appGetMock } }))

import { channelHandlers } from '../channel'

const channelManager = { getChannelLogs: vi.fn(), getAllStatuses: vi.fn() }
const ctx = { senderId: 'w1' }

beforeEach(() => {
  vi.clearAllMocks()
  appGetMock.mockImplementation((name: string) => {
    if (name === 'ChannelManager') return channelManager
    throw new Error(`Unexpected application.get(${name})`)
  })
})

describe('channelHandlers', () => {
  it('get_logs and get_statuses delegate to ChannelManager', async () => {
    channelManager.getChannelLogs.mockReturnValue([{ timestamp: 1, level: 'info', message: 'm', channelId: 'c1' }])
    channelManager.getAllStatuses.mockReturnValue([{ channelId: 'c1', connected: true }])
    expect(await channelHandlers['channel.get_logs']('c1', ctx)).toEqual([
      { timestamp: 1, level: 'info', message: 'm', channelId: 'c1' }
    ])
    expect(channelManager.getChannelLogs).toHaveBeenCalledWith('c1')
    expect(await channelHandlers['channel.get_statuses'](undefined, ctx)).toEqual([
      { channelId: 'c1', connected: true }
    ])
  })
})
