import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dusk/ui'
import { PermissionModeSelectItem } from '@renderer/components/PermissionModeOption'
import type { PermissionMode } from '@renderer/types/agent'
import { permissionModeCards } from '@renderer/utils/agent'
import type { ReactNode } from 'react'
import { type FC, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ChannelData } from './channelTypes'

// --------------- Permission mode ---------------

const INHERIT_PERMISSION_MODE_VALUE = '__inherit'

// --------------- Form types ---------------

type FieldDef = {
  key: string
  label: string
  placeholder: string
  secret?: boolean
  span?: 1 | 2
}

type ChatIdsConfig = {
  label: string
  placeholder: string
  hint: string
  extraHint?: string
  fullWidth?: boolean
  configKey?: string
}

type ChannelFormProps = {
  channel: ChannelData
  onConfigChange: (updates: Partial<ChannelData>) => void
}

type ChannelFieldsFormProps = ChannelFormProps & {
  fields: FieldDef[]
  chatIds: ChatIdsConfig
  extraContent?: ReactNode
}

// --------------- Shared form components ---------------

const ChannelPermissionMode: FC<ChannelFormProps> = ({ channel, onConfigChange }) => {
  const { t } = useTranslation()
  const selectedCard = permissionModeCards.find((card) => card.mode === channel.permissionMode)
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{t('agent.channels.security.permissionMode')}</Label>
      <Select
        value={channel.permissionMode ?? INHERIT_PERMISSION_MODE_VALUE}
        onValueChange={(value) =>
          onConfigChange({
            permissionMode: value === INHERIT_PERMISSION_MODE_VALUE ? null : (value as PermissionMode)
          })
        }>
        <SelectTrigger size="sm" className="w-full">
          {/* Own children so the trigger stays one line: the items below can be two. */}
          <SelectValue>
            {selectedCard ? (
              <span className={selectedCard.dangerous ? 'text-destructive' : undefined}>
                {t(selectedCard.titleKey, selectedCard.titleFallback)}
              </span>
            ) : (
              t('agent.channels.security.inheritFromAgent')
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INHERIT_PERMISSION_MODE_VALUE}>{t('agent.channels.security.inheritFromAgent')}</SelectItem>
          {permissionModeCards.map((card) => (
            <PermissionModeSelectItem key={card.mode} card={card} compact t={t} />
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const ChannelFieldsForm: FC<ChannelFieldsFormProps> = ({
  channel,
  onConfigChange,
  fields,
  chatIds: chatIdsConfig,
  extraContent
}) => {
  const { t } = useTranslation()
  const cfg = channel.config
  const idsKey = chatIdsConfig.configKey ?? 'allowed_chat_ids'

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, (cfg[f.key] as string) ?? '']))
  )
  const [chatIds, setChatIds] = useState(((cfg[idsKey] as string[]) ?? []).join(', '))

  useEffect(() => {
    setFieldValues(Object.fromEntries(fields.map((f) => [f.key, (cfg[f.key] as string) ?? ''])))
    setChatIds(((cfg[idsKey] as string[]) ?? []).join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(fields.map((f) => cfg[f.key])), cfg[idsKey]])

  const saveField = useCallback(
    (key: string, value: string) => {
      const trimmed = value.trim()
      if (trimmed !== ((cfg[key] as string) ?? '')) {
        onConfigChange({ config: { ...cfg, [key]: trimmed } })
      }
    },
    [cfg, onConfigChange]
  )

  const saveChatIds = useCallback(() => {
    const ids = chatIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (JSON.stringify(ids) !== JSON.stringify((cfg[idsKey] as string[]) ?? [])) {
      onConfigChange({ config: { ...cfg, [idsKey]: ids } })
    }
  }, [chatIds, cfg, idsKey, onConfigChange])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => (
          <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
            <Label className="mb-1 block text-xs">{field.label}</Label>
            {field.secret ? (
              <Input
                type="password"
                value={fieldValues[field.key] ?? ''}
                onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                onBlur={() => saveField(field.key, fieldValues[field.key] ?? '')}
                placeholder={field.placeholder}
                className="h-8 text-sm"
              />
            ) : (
              <Input
                value={fieldValues[field.key] ?? ''}
                onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                onBlur={() => saveField(field.key, fieldValues[field.key] ?? '')}
                placeholder={field.placeholder}
                className="h-8 text-sm"
              />
            )}
          </div>
        ))}
        {extraContent}
        <div className={chatIdsConfig.fullWidth ? 'col-span-2' : ''}>
          <Label className="mb-1 block text-xs">{chatIdsConfig.label}</Label>
          <Input
            value={chatIds}
            onChange={(e) => setChatIds(e.target.value)}
            onBlur={saveChatIds}
            placeholder={chatIdsConfig.placeholder}
            className="h-8 text-sm"
          />
          <span className="mt-1 block text-muted-foreground text-xs">{chatIdsConfig.hint}</span>
          {!chatIds.trim() && idsKey === 'allowed_chat_ids' && (
            <span className="mt-1 block text-warning text-xs">{t('agent.channels.chatIdsAutoTrackHint')}</span>
          )}
          {chatIdsConfig.extraHint && <span className="mt-1 block text-info text-xs">{chatIdsConfig.extraHint}</span>}
        </div>
      </div>
      <ChannelPermissionMode channel={channel} onConfigChange={onConfigChange} />
    </div>
  )
}

// --------------- Type-specific forms ---------------

export const TelegramForm: FC<ChannelFormProps> = ({ channel, onConfigChange }) => {
  const { t } = useTranslation()
  return (
    <ChannelFieldsForm
      channel={channel}
      onConfigChange={onConfigChange}
      fields={[
        {
          key: 'bot_token',
          label: t('agent.channels.telegram.botToken'),
          placeholder: t('agent.channels.telegram.botTokenPlaceholder'),
          secret: true
        }
      ]}
      chatIds={{
        label: t('agent.channels.telegram.chatIds'),
        placeholder: t('agent.channels.telegram.chatIdsPlaceholder'),
        hint: t('agent.channels.telegram.chatIdsHint')
      }}
    />
  )
}

export const DiscordForm: FC<ChannelFormProps> = ({ channel, onConfigChange }) => {
  const { t } = useTranslation()
  return (
    <ChannelFieldsForm
      channel={channel}
      onConfigChange={onConfigChange}
      fields={[
        {
          key: 'bot_token',
          label: t('agent.channels.discord.botToken'),
          placeholder: t('agent.channels.discord.botTokenPlaceholder'),
          secret: true,
          span: 2
        }
      ]}
      chatIds={{
        label: t('agent.channels.discord.channelIds'),
        placeholder: t('agent.channels.discord.channelIdsPlaceholder'),
        hint: t('agent.channels.discord.channelIdsHint'),
        extraHint: t('agent.channels.discord.whoamiTip'),
        fullWidth: true,
        configKey: 'allowed_channel_ids'
      }}
    />
  )
}

export const SlackForm: FC<ChannelFormProps> = ({ channel, onConfigChange }) => {
  const { t } = useTranslation()
  return (
    <ChannelFieldsForm
      channel={channel}
      onConfigChange={onConfigChange}
      fields={[
        {
          key: 'bot_token',
          label: t('agent.channels.slack.botToken'),
          placeholder: t('agent.channels.slack.botTokenPlaceholder'),
          secret: true,
          span: 2
        },
        {
          key: 'app_token',
          label: t('agent.channels.slack.appToken'),
          placeholder: t('agent.channels.slack.appTokenPlaceholder'),
          secret: true,
          span: 2
        }
      ]}
      chatIds={{
        label: t('agent.channels.slack.channelIds'),
        placeholder: t('agent.channels.slack.channelIdsPlaceholder'),
        hint: t('agent.channels.slack.channelIdsHint'),
        extraHint: t('agent.channels.slack.whoamiTip'),
        fullWidth: true,
        configKey: 'allowed_channel_ids'
      }}
    />
  )
}

export const getFormForType = (type: string) => {
  switch (type) {
    case 'telegram':
      return TelegramForm
    case 'discord':
      return DiscordForm
    case 'slack':
      return SlackForm
    default:
      return null
  }
}
