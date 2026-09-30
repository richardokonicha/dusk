import * as z from 'zod'

// ---- Per-channel-type config schemas ----

export const TelegramChannelConfigSchema = z.object({
  type: z.literal('telegram'),
  bot_token: z.string(),
  allowed_chat_ids: z.array(z.string()).default([])
})

export type TelegramChannelConfig = z.infer<typeof TelegramChannelConfigSchema>

export const DiscordChannelConfigSchema = z.object({
  type: z.literal('discord'),
  bot_token: z.string(),
  allowed_channel_ids: z.array(z.string()).default([])
})

export type DiscordChannelConfig = z.infer<typeof DiscordChannelConfigSchema>

export const SlackChannelConfigSchema = z.object({
  type: z.literal('slack'),
  bot_token: z.string(),
  app_token: z.string(),
  allowed_channel_ids: z.array(z.string()).default([])
})

export type SlackChannelConfig = z.infer<typeof SlackChannelConfigSchema>

// ---- Discriminated union ----

export const MobileChannelConfigSchema = z.object({
  type: z.literal('mobile'),
  device_token: z.string(),
  allowed_chat_ids: z.array(z.string()).default([])
})

export type MobileChannelConfig = z.infer<typeof MobileChannelConfigSchema>

export const ChannelConfigSchema = z.discriminatedUnion('type', [
  MobileChannelConfigSchema,
  TelegramChannelConfigSchema,
  DiscordChannelConfigSchema,
  SlackChannelConfigSchema
])

export type ChannelConfig = z.infer<typeof ChannelConfigSchema>

export const CHANNEL_TYPES = ['mobile', 'telegram', 'discord', 'slack'] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]
