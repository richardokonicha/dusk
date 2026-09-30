import { ChannelAdapter, type SendMessageOptions } from '../../ChannelAdapter'
import { registerAdapterFactory } from '../../ChannelManager'

/**
 * Placeholder for the Dusk mobile app. The transport is not wired yet, so this
 * adapter never reaches a connected state — the settings entry is gated off
 * (`available: false`) until pairing and push delivery land.
 */
export class MobileAdapter extends ChannelAdapter {
  protected async performConnect(_signal: AbortSignal): Promise<void> {
    this.log.info('Mobile channel transport is not implemented yet')
  }

  protected async performDisconnect(): Promise<void> {
    // No resources held while disconnected.
  }

  async sendMessage(_chatId: string, _text: string, _opts?: SendMessageOptions): Promise<void> {
    throw new Error('Mobile channel is not implemented yet')
  }

  async sendTypingIndicator(_chatId: string, _opts?: SendMessageOptions): Promise<void> {
    throw new Error('Mobile channel is not implemented yet')
  }
}

// Self-registration
registerAdapterFactory('mobile', (channel, agentId) => {
  return new MobileAdapter({
    channelId: channel.id,
    channelType: channel.type,
    agentId,
    channelConfig: channel.config
  })
})
