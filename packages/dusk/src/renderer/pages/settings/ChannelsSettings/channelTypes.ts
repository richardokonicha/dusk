import type { AgentSessionWorkspaceSource } from '@shared/data/api/schemas/agentWorkspaces'

export type AvailableChannel = {
  type: 'mobile' | 'telegram' | 'discord' | 'slack'
  name: string
  titleKey: string
  description: string
  available: boolean
  defaultConfig: Record<string, unknown>
}

export const AVAILABLE_CHANNELS: AvailableChannel[] = [
  {
    type: 'mobile',
    name: 'Mobile',
    titleKey: 'agent.channels.mobile.title',
    description: 'agent.channels.mobile.description',
    available: false,
    defaultConfig: { device_token: '', allowed_chat_ids: [] }
  },
  {
    type: 'telegram',
    name: 'Telegram',
    titleKey: 'agent.channels.telegram.title',
    description: 'agent.channels.telegram.description',
    available: true,
    defaultConfig: { bot_token: '', allowed_chat_ids: [] }
  },
  {
    type: 'discord',
    name: 'Discord',
    titleKey: 'agent.channels.discord.title',
    description: 'agent.channels.discord.description',
    available: true,
    defaultConfig: { bot_token: '', allowed_channel_ids: [] }
  },
  {
    type: 'slack',
    name: 'Slack',
    titleKey: 'agent.channels.slack.title',
    description: 'agent.channels.slack.description',
    available: true,
    defaultConfig: { bot_token: '', app_token: '', allowed_channel_ids: [] }
  }
]

export type ChannelData = {
  id: string
  type: string
  name: string
  agentId?: string | null
  workspace?: AgentSessionWorkspaceSource
  config: Record<string, unknown>
  isActive: boolean
  permissionMode?: string | null
  createdAt?: number | null
  updatedAt?: number | null
}
