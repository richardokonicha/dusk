import * as z from 'zod'

import { AgentPermissionModeSchema } from './agents'
import { AgentSessionWorkspaceSourceSchema } from './agentWorkspaces'

export const AgentChannelTypeSchema = z.enum(['mobile', 'telegram', 'discord', 'slack'])
export type AgentChannelType = z.infer<typeof AgentChannelTypeSchema>

export const TelegramAgentChannelConfigSchema = z.strictObject({
  bot_token: z.string(),
  allowed_chat_ids: z.array(z.string()).optional()
})

export const MobileAgentChannelConfigSchema = z.strictObject({
  device_token: z.string(),
  allowed_chat_ids: z.array(z.string()).optional()
})

export const DiscordAgentChannelConfigSchema = z.strictObject({
  bot_token: z.string(),
  allowed_channel_ids: z.array(z.string()).optional()
})

export const SlackAgentChannelConfigSchema = z.strictObject({
  bot_token: z.string(),
  app_token: z.string(),
  allowed_channel_ids: z.array(z.string()).optional()
})

export const AgentChannelConfigSchemasByType = {
  mobile: MobileAgentChannelConfigSchema,
  telegram: TelegramAgentChannelConfigSchema,
  discord: DiscordAgentChannelConfigSchema,
  slack: SlackAgentChannelConfigSchema
} as const satisfies Record<AgentChannelType, z.ZodType<Record<string, unknown>>>

export const ActiveAgentChannelConfigSchemasByType = {
  mobile: MobileAgentChannelConfigSchema.extend({ device_token: z.string().min(1) }),
  telegram: TelegramAgentChannelConfigSchema.extend({ bot_token: z.string().min(1) }),
  discord: DiscordAgentChannelConfigSchema.extend({ bot_token: z.string().min(1) }),
  slack: SlackAgentChannelConfigSchema.extend({
    bot_token: z.string().min(1),
    app_token: z.string().min(1)
  })
} as const satisfies Record<AgentChannelType, z.ZodType<Record<string, unknown>>>

export type MobileAgentChannelConfig = z.infer<typeof MobileAgentChannelConfigSchema>
export type TelegramAgentChannelConfig = z.infer<typeof TelegramAgentChannelConfigSchema>
export type DiscordAgentChannelConfig = z.infer<typeof DiscordAgentChannelConfigSchema>
export type SlackAgentChannelConfig = z.infer<typeof SlackAgentChannelConfigSchema>
export type AgentChannelConfig =
  | MobileAgentChannelConfig
  | TelegramAgentChannelConfig
  | DiscordAgentChannelConfig
  | SlackAgentChannelConfig

const AgentChannelBaseFields = {
  id: z.string(),
  name: z.string(),
  agentId: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  workspace: AgentSessionWorkspaceSourceSchema,
  isActive: z.boolean(),
  activeChatIds: z.array(z.string()).optional(),
  permissionMode: AgentPermissionModeSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
} as const

const MutableAgentChannelFields = {
  name: z.string(),
  agentId: z.string().nullable().optional(),
  workspace: AgentSessionWorkspaceSourceSchema,
  isActive: z.boolean(),
  activeChatIds: z.array(z.string()).optional(),
  permissionMode: AgentPermissionModeSchema.nullable().optional()
} as const

function createAgentChannelEntitySchema<
  TType extends AgentChannelType,
  TConfig extends z.ZodType<Record<string, unknown>>
>(type: TType, configSchema: TConfig) {
  return z.strictObject({
    ...AgentChannelBaseFields,
    type: z.literal(type),
    config: configSchema
  })
}

function createAgentChannelMutationSchema<
  TType extends AgentChannelType,
  TConfig extends z.ZodType<Record<string, unknown>>
>(type: TType, configSchema: TConfig) {
  return z.strictObject({
    type: z.literal(type),
    ...MutableAgentChannelFields,
    config: configSchema
  })
}

export const TelegramAgentChannelEntitySchema = createAgentChannelEntitySchema(
  'telegram',
  TelegramAgentChannelConfigSchema
)
export const MobileAgentChannelEntitySchema = createAgentChannelEntitySchema('mobile', MobileAgentChannelConfigSchema)
export const DiscordAgentChannelEntitySchema = createAgentChannelEntitySchema(
  'discord',
  DiscordAgentChannelConfigSchema
)
export const SlackAgentChannelEntitySchema = createAgentChannelEntitySchema('slack', SlackAgentChannelConfigSchema)

export const AgentChannelEntitySchema = z.discriminatedUnion('type', [
  MobileAgentChannelEntitySchema,
  TelegramAgentChannelEntitySchema,
  DiscordAgentChannelEntitySchema,
  SlackAgentChannelEntitySchema
])
export type AgentChannelEntity = z.infer<typeof AgentChannelEntitySchema>

export const TelegramCreateAgentChannelSchema = createAgentChannelMutationSchema(
  'telegram',
  TelegramAgentChannelConfigSchema
)
export const MobileCreateAgentChannelSchema = createAgentChannelMutationSchema('mobile', MobileAgentChannelConfigSchema)
export const DiscordCreateAgentChannelSchema = createAgentChannelMutationSchema(
  'discord',
  DiscordAgentChannelConfigSchema
)
export const SlackCreateAgentChannelSchema = createAgentChannelMutationSchema('slack', SlackAgentChannelConfigSchema)

export const CreateAgentChannelSchema = z.discriminatedUnion('type', [
  MobileCreateAgentChannelSchema,
  TelegramCreateAgentChannelSchema,
  DiscordCreateAgentChannelSchema,
  SlackCreateAgentChannelSchema
])
export type CreateAgentChannelDto = z.infer<typeof CreateAgentChannelSchema>

export const UpdateAgentChannelSchema = z.strictObject({
  name: z.string().optional(),
  agentId: z.string().nullable().optional(),
  workspace: AgentSessionWorkspaceSourceSchema.optional(),
  config: z
    .union([
      MobileAgentChannelConfigSchema,
      TelegramAgentChannelConfigSchema,
      DiscordAgentChannelConfigSchema,
      SlackAgentChannelConfigSchema
    ])
    .optional(),
  isActive: z.boolean().optional(),
  activeChatIds: z.array(z.string()).optional(),
  permissionMode: AgentPermissionModeSchema.nullable().optional()
})
export type UpdateAgentChannelDto = z.infer<typeof UpdateAgentChannelSchema>

export const AgentChannelListQuerySchema = z.strictObject({
  agentId: z.string().optional(),
  type: AgentChannelTypeSchema.optional()
})
export type AgentChannelListQuery = z.infer<typeof AgentChannelListQuerySchema>

export type AgentChannelSchemas = {
  '/agent-channels': {
    GET: {
      query?: AgentChannelListQuery
      response: AgentChannelEntity[]
    }
    POST: {
      body: CreateAgentChannelDto
      response: AgentChannelEntity
    }
  }

  '/agent-channels/:channelId': {
    GET: {
      params: { channelId: string }
      response: AgentChannelEntity
    }
    PATCH: {
      params: { channelId: string }
      body: UpdateAgentChannelDto
      response: AgentChannelEntity
    }
    DELETE: {
      params: { channelId: string }
      response: void
    }
  }
}
