import { ipcApi } from '@renderer/ipc'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { InsightCell, UsagePanel, UsagePanelHeader, UsageSection } from './UsageSettingsPrimitives'

type ResourceUsage = {
  memory: {
    rssBytes: number
    heapUsedBytes: number
    heapTotalBytes: number
    externalBytes: number
    systemTotalBytes: number
    systemFreeBytes: number
  }
  disk: {
    appDataBytes: number
    cacheBytes: number
    logsBytes: number
  }
}

const POLL_INTERVAL_MS = 5000

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`
}

export function ResourceUsagePanel() {
  const { t } = useTranslation()
  const [usage, setUsage] = useState<ResourceUsage | null>(null)

  const refresh = useCallback(async () => {
    try {
      setUsage(await ipcApi.request('app.get_resource_usage'))
    } catch {
      setUsage(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const systemUsed = usage ? usage.memory.systemTotalBytes - usage.memory.systemFreeBytes : null
  const systemPercent = systemUsed !== null && usage ? (systemUsed / usage.memory.systemTotalBytes) * 100 : null

  return (
    <UsageSection>
      <UsagePanel>
        <UsagePanelHeader>
          <h2 className="font-medium text-foreground text-sm">{t('settings.usage.resources.title')}</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">{t('settings.usage.resources.subtitle')}</p>
        </UsagePanelHeader>
        <div className="grid @[640px]/usage:grid-cols-4 grid-cols-2">
          <InsightCell
            label={t('settings.usage.resources.memory')}
            value={usage ? formatBytes(usage.memory.rssBytes) : '—'}
            helper={t('settings.usage.resources.memoryHelper')}
          />
          <InsightCell
            label={t('settings.usage.resources.heap')}
            value={usage ? formatBytes(usage.memory.heapUsedBytes) : '—'}
            helper={
              usage
                ? t('settings.usage.resources.heapHelper', { total: formatBytes(usage.memory.heapTotalBytes) })
                : undefined
            }
          />
          <InsightCell
            label={t('settings.usage.resources.systemMemory')}
            value={systemPercent === null ? '—' : `${systemPercent.toFixed(0)}%`}
            helper={
              systemUsed === null || !usage
                ? undefined
                : t('settings.usage.resources.systemMemoryHelper', {
                    used: formatBytes(systemUsed),
                    total: formatBytes(usage.memory.systemTotalBytes)
                  })
            }
          />
          <InsightCell
            label={t('settings.usage.resources.disk')}
            value={usage ? formatBytes(usage.disk.appDataBytes) : '—'}
            helper={
              usage
                ? t('settings.usage.resources.diskHelper', {
                    cache: formatBytes(usage.disk.cacheBytes),
                    logs: formatBytes(usage.disk.logsBytes)
                  })
                : undefined
            }
          />
        </div>
      </UsagePanel>
    </UsageSection>
  )
}
