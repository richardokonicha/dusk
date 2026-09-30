import fs from 'node:fs/promises'
import { arch, freemem, totalmem } from 'node:os'
import path from 'node:path'

import { application } from '@application'
import { loggerService } from '@logger'
import { isWin } from '@main/core/platform'
import { cacheCleanupService } from '@main/services/cacheCleanup'
import { requestDataReset, requestV1Remigration } from '@main/services/dataReset'
import { inspectUserDataRelocationTarget, requestUserDataRelocation } from '@main/services/userDataRelocation'
import { handleZoomFactor } from '@main/utils/zoom'
import { IpcError } from '@shared/ipc/errors/IpcError'
import type { appRequestSchemas } from '@shared/ipc/schemas/app'
import type { IpcHandlersFor } from '@shared/ipc/types'
import { app, BrowserWindow } from 'electron'

async function dirSize(dir: string): Promise<number> {
  let total = 0
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await dirSize(full)
    } else if (entry.isFile()) {
      try {
        total += (await fs.stat(full)).size
      } catch {
        // entry vanished mid-walk; skip it
      }
    }
  }
  return total
}

export const appHandlers: IpcHandlersFor<typeof appRequestSchemas> = {
  'app.get_resource_usage': async () => {
    const mem = process.memoryUsage()
    const appDataPath = application.getPath('app.userdata')
    return {
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        externalBytes: mem.external,
        systemTotalBytes: totalmem(),
        systemFreeBytes: freemem()
      },
      disk: {
        appDataBytes: await dirSize(appDataPath),
        cacheBytes: await dirSize(path.join(appDataPath, 'Cache')),
        logsBytes: await dirSize(loggerService.getLogsDir())
      }
    }
  },
  'app.get_info': async () => ({
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    appPath: application.getPath('app.root'),
    homePath: application.getPath('sys.home'),
    notesPath: application.getPath('feature.notes.data'),
    configPath: application.getPath('dusk.config'),
    appDataPath: application.getPath('app.userdata'),
    resourcesPath: application.getPath('app.root.resources'),
    logsPath: loggerService.getLogsDir(),
    arch: arch(),
    isPortable: isWin && 'PORTABLE_EXECUTABLE_DIR' in process.env,
    installPath: application.getPath('app.install')
  }),
  // The request face of userData relocation IPC: the running app validates a
  // target and persists the request here. The execution face (a relocation-only
  // launch) never starts IpcApiService — its progress window talks over bare
  // UserDataRelocationIpcChannels instead (services/userDataRelocation/window.ts).
  'app.user_data_relocation.inspect': async ({ path }) => inspectUserDataRelocationTarget(path),
  'app.user_data_relocation.request': async ({ path, copy }) => {
    if (!app.isPackaged) {
      throw new IpcError('USER_DATA_RELOCATION_UNAVAILABLE', 'userData relocation is available only in packaged builds')
    }
    requestUserDataRelocation(path, copy)
  },
  'app.cache_cleanup.inspect': async ({ groups }) => cacheCleanupService.inspect(groups),
  'app.cache_cleanup.run': async ({ groups }) => cacheCleanupService.run(groups),
  'app.relaunch': async () => application.relaunch(),
  'app.adjust_zoom': async ({ delta, reset = false }) => {
    handleZoomFactor(BrowserWindow.getAllWindows(), delta, reset)
    return application.get('PreferenceService').get('app.zoom_factor')
  },
  'app.data_reset.request': async () => requestDataReset(),
  'app.migration_v2.rerun': async () => requestV1Remigration(),
  'app.updater.check_for_update': async () => {
    await application.get('AppUpdaterService').checkForUpdates()
  },
  'app.updater.release_notes.get': async () => application.get('AppUpdaterService').getReleaseHistory(),
  'app.updater.quit_and_install': async () => {
    application.get('AppUpdaterService').quitAndInstall()
  }
}
