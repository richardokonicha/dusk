const SESSION_TOPIC_PREFIX = 'agent-session:'

export const buildAgentFileWorkspaceKey = (workspaceId?: string | null, workspacePath?: string): string => {
  return `${workspaceId ?? ''}\0${workspacePath ?? ''}`
}

export const buildAgentSessionTopicId = (sessionId: string): string => {
  return `${SESSION_TOPIC_PREFIX}${sessionId}`
}

export const extractAgentSessionIdFromTopicId = (topicId: string): string => {
  return topicId.replace(SESSION_TOPIC_PREFIX, '')
}

import discordIcon from '@renderer/assets/images/channel/discord.svg'
import slackIcon from '@renderer/assets/images/channel/slack.svg'
import telegramIcon from '@renderer/assets/images/channel/telegram.png'

const CHANNEL_TYPE_ICONS: Record<string, string> = {
  telegram: telegramIcon,
  discord: discordIcon,
  slack: slackIcon
}

export const getChannelTypeIcon = (channelType: string | undefined): string | undefined => {
  if (!channelType) return undefined
  return CHANNEL_TYPE_ICONS[channelType]
}
