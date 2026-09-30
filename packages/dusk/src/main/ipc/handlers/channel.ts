import { application } from '@application'
import type { channelRequestSchemas } from '@shared/ipc/schemas/channel'
import type { IpcHandlersFor } from '@shared/ipc/types'

/**
 * Channel-domain request handlers. `wechat.has_credentials` is self-contained (reads the
 * bot token file, returns whether it exists) — it does not touch ChannelManager; the log /
 * status queries delegate to ChannelManager. The channel.* events are emitted by the
 * adapters / ChannelManager, not here.
 */
export const channelHandlers: IpcHandlersFor<typeof channelRequestSchemas> = {
  'channel.get_logs': async (channelId) => application.get('ChannelManager').getChannelLogs(channelId),
  'channel.get_statuses': async () => application.get('ChannelManager').getAllStatuses()
}
