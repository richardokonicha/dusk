// Configuration
const config = {
  R2_CUSTOM_DOMAIN: 'dusk.ocool.online',
  R2_BUCKET_NAME: 'dusk',
  // Cache key name
  CACHE_KEY: 'dusk-latest-release',
  VERSION_DB: 'versions.json',
  LOG_FILE: 'logs.json',
  MAX_LOGS: 1000 // Maximum number of logs to keep
}

// Worker entry point
const worker = {
  // Scheduled trigger configuration
  scheduled: {
    cron: '*/1 * * * *' // Run every minute
  },

  // Scheduled execution function - only responsible for checking and updating
  async scheduled(event, env, ctx) {
    try {
      await initDataFiles(env)
      console.log('Starting scheduled version check...')
      // Use the new checkNewRelease function
      await checkNewRelease(env)
    } catch (error) {
      console.error('Scheduled task failed:', error)
    }
  },

  // HTTP request handler - only responsible for returning data
  async fetch(request, env, ctx) {
    if (!env || !env.R2_BUCKET) {
      return new Response(
        JSON.stringify({
          error: 'R2 bucket not properly configured'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(request.url)
    const filename = url.pathname.slice(1)

    try {
      // Handle file download requests
      if (filename) {
        return await handleDownload(env, filename)
      }

      // Only return cached version info
      return await getCachedRelease(env)
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export default worker

/**
 * Add log entry
 */
async function addLog(env, type, event, details = null) {
  try {
    const logFile = await env.R2_BUCKET.get(config.LOG_FILE)
    let logs = { logs: [] }

    if (logFile) {
      logs = JSON.parse(await logFile.text())
    }

    logs.logs.unshift({
      timestamp: new Date().toISOString(),
      type,
      event,
      details
    })

    // Keep log count within limit
    if (logs.logs.length > config.MAX_LOGS) {
      logs.logs = logs.logs.slice(0, config.MAX_LOGS)
    }

    await env.R2_BUCKET.put(config.LOG_FILE, JSON.stringify(logs, null, 2))
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

/**
 * Get latest release information
 */
async function getLatestRelease(env) {
  try {
    const cached = await env.R2_BUCKET.get(config.CACHE_KEY)
    if (!cached) {
      // If cache doesn't exist, check version database first
      const versionDB = await env.R2_BUCKET.get(config.VERSION_DB)
      if (versionDB) {
        const versions = JSON.parse(await versionDB.text())
        if (versions.latestVersion) {
          // Rebuild cache from version database
          const latestVersion = versions.versions[versions.latestVersion]
          const cacheData = {
            version: latestVersion.version,
            publishedAt: latestVersion.publishedAt,
            changelog: latestVersion.changelog,
            downloads: latestVersion.files
              .filter((file) => file.uploaded)
              .map((file) => ({
                name: file.name,
                url: `https://${config.R2_CUSTOM_DOMAIN}/${file.name}`,
                size: formatFileSize(file.size)
              }))
          }
          // Update cache
          await env.R2_BUCKET.put(config.CACHE_KEY, JSON.stringify(cacheData))
          return new Response(JSON.stringify(cacheData), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
      }
      // If version database also has no data, then check for updates
      const data = await checkNewRelease(env)
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const data = await cached.text()
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    await addLog(env, 'ERROR', 'Failed to get version info', error.message)
    return new Response(
      JSON.stringify({
        error: 'Failed to get version info: ' + error.message,
        detail: 'Please try again later'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}

// Modified download handler to directly accept env
async function handleDownload(env, filename) {
  try {
    const object = await env.R2_BUCKET.get(filename)

    if (!object) {
      return new Response('File not found', { status: 404 })
    }

    // Set response headers
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new Response(object.body, {
      headers
    })
  } catch (error) {
    console.error('Error downloading file:', error)
    return new Response('Failed to get file', { status: 500 })
  }
}

/**
 * Get Content-Type based on file extension
 */
function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const types = {
    exe: 'application/x-msdownload', // Windows executable
    dmg: 'application/x-apple-diskimage', // macOS installer
    zip: 'application/zip', // Archive
    AppImage: 'application/x-executable', // Linux executable
    blockmap: 'application/octet-stream' // Update file
  }
  return types[ext] || 'application/octet-stream'
}

/**
 * Format file size
 * Convert bytes to human-readable format (B, KB, MB, GB)
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Version comparison function
 * Used for sorting version numbers
 */
function compareVersions(a, b) {
  const partsA = a.replace('v', '').split('.')
  const partsB = b.replace('v', '').split('.')

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = parseInt(partsA[i] || 0)
    const numB = parseInt(partsB[i] || 0)

    if (numA !== numB) {
      return numA - numB
    }
  }

  return 0
}

/**
 * Initialize data files
 */
async function initDataFiles(env) {
  try {
    // Check and initialize version database
    const versionDB = await env.R2_BUCKET.get(config.VERSION_DB)
    if (!versionDB) {
      const initialVersions = {
        versions: {},
        latestVersion: null,
        lastChecked: new Date().toISOString()
      }
      await env.R2_BUCKET.put(config.VERSION_DB, JSON.stringify(initialVersions, null, 2))
      await addLog(env, 'INFO', 'versions.json initialized successfully')
    }

    // Check and initialize log file
    const logFile = await env.R2_BUCKET.get(config.LOG_FILE)
    if (!logFile) {
      const initialLogs = {
        logs: [
          {
            timestamp: new Date().toISOString(),
            type: 'INFO',
            event: 'System initialized'
          }
        ]
      }
      await env.R2_BUCKET.put(config.LOG_FILE, JSON.stringify(initialLogs, null, 2))
      console.log('logs.json initialized successfully')
    }
  } catch (error) {
    console.error('Failed to initialize data files:', error)
  }
}

// New: Only get cached version info
async function getCachedRelease(env) {
  try {
    const cached = await env.R2_BUCKET.get(config.CACHE_KEY)
    if (!cached) {
      // If cache doesn't exist, get from version database
      const versionDB = await env.R2_BUCKET.get(config.VERSION_DB)
      if (versionDB) {
        const versions = JSON.parse(await versionDB.text())
        if (versions.latestVersion) {
          const latestVersion = versions.versions[versions.latestVersion]
          const cacheData = {
            version: latestVersion.version,
            publishedAt: latestVersion.publishedAt,
            changelog: latestVersion.changelog,
            downloads: latestVersion.files
              .filter((file) => file.uploaded)
              .map((file) => ({
                name: file.name,
                url: `https://${config.R2_CUSTOM_DOMAIN}/${file.name}`,
                size: formatFileSize(file.size)
              }))
          }
          // Rebuild cache
          await env.R2_BUCKET.put(config.CACHE_KEY, JSON.stringify(cacheData))
          return new Response(JSON.stringify(cacheData), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
      }
      // If no data at all, return error
      return new Response(
        JSON.stringify({
          error: 'No version information available'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Return cached data
    return new Response(await cached.text(), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    await addLog(env, 'ERROR', 'Failed to get cached version info', error.message)
    throw error
  }
}

// New: Only check for new version and update
async function checkNewRelease(env) {
  try {
    // Get latest release from GitLab
    const githubResponse = await fetch('https://gitlab.com/api/v4/projects/fugoku.inc%2Fdusk/releases', {
      headers: { 'User-Agent': 'CloudflareWorker' }
    })

    if (!githubResponse.ok) {
      throw new Error('GitLab API request failed')
    }

    const releases = await githubResponse.json()
    const releaseData = Array.isArray(releases) ? releases[0] : undefined
    if (!releaseData) {
      throw new Error('No release found')
    }
    const version = releaseData.tag_name

    // Get version database
    const versionDB = await env.R2_BUCKET.get(config.VERSION_DB)
    let versions = { versions: {}, latestVersion: null, lastChecked: new Date().toISOString() }

    if (versionDB) {
      versions = JSON.parse(await versionDB.text())
    }

    // Remove version check, instead record flag for file updates
    let hasUpdates = false
    if (versions.latestVersion !== version) {
      await addLog(env, 'INFO', `New version found: ${version}`)
      hasUpdates = true
    } else {
      await addLog(env, 'INFO', `Version ${version} file integrity check started`)
    }

    // Prepare new version record (GitLab release: assets.links[].name / .url / .direct_asset_url)
    const assetLinks = releaseData.assets?.links ?? []
    const versionRecord = {
      version,
      publishedAt: releaseData.released_at,
      uploadedAt: null,
      files: assetLinks.map((asset) => ({
        name: asset.name,
        size: asset.size ?? null,
        uploaded: false
      })),
      changelog: releaseData.description
    }

    // Check and upload files
    for (const asset of assetLinks) {
      try {
        const existingFile = await env.R2_BUCKET.get(asset.name)
        const expectedSize = asset.size ?? null
        const sizeMatches = expectedSize === null || existingFile?.size === expectedSize
        if (!existingFile || !sizeMatches) {
          hasUpdates = true
          const response = await fetch(asset.direct_asset_url ?? asset.url)
          if (!response.ok) {
            throw new Error(`Download failed: HTTP ${response.status}`)
          }

          const file = await response.arrayBuffer()
          await env.R2_BUCKET.put(asset.name, file, {
            httpMetadata: { contentType: getContentType(asset.name) }
          })

          // Update file status
          const fileIndex = versionRecord.files.findIndex((f) => f.name === asset.name)
          if (fileIndex !== -1) {
            versionRecord.files[fileIndex].uploaded = true
          }

          await addLog(env, 'INFO', `File ${existingFile ? 'updated' : 'uploaded'} successfully: ${asset.name}`)
        } else {
          // File exists and size matches, mark as uploaded
          const fileIndex = versionRecord.files.findIndex((f) => f.name === asset.name)
          if (fileIndex !== -1) {
            versionRecord.files[fileIndex].uploaded = true
          }
          await addLog(env, 'INFO', `File integrity verified: ${asset.name}`)
        }
      } catch (error) {
        await addLog(env, 'ERROR', `File processing failed: ${asset.name}`, error.message)
      }
    }

    // Only update database and cache if there are updates or it's a new version
    if (hasUpdates) {
      // Update version record
      versionRecord.uploadedAt = new Date().toISOString()
      versions.versions[version] = versionRecord
      versions.latestVersion = version

      // Save version database
      await env.R2_BUCKET.put(config.VERSION_DB, JSON.stringify(versions, null, 2))

      // Update cache
      const cacheData = {
        version,
        publishedAt: releaseData.published_at,
        changelog: releaseData.body,
        downloads: versionRecord.files
          .filter((file) => file.uploaded)
          .map((file) => ({
            name: file.name,
            url: `https://${config.R2_CUSTOM_DOMAIN}/${file.name}`,
            size: formatFileSize(file.size)
          }))
      }

      await env.R2_BUCKET.put(config.CACHE_KEY, JSON.stringify(cacheData))
      await addLog(env, 'INFO', hasUpdates ? 'Update complete' : 'File integrity check complete')

      // Clean up old versions
      const versionList = Object.keys(versions.versions).sort((a, b) => compareVersions(b, a))
      if (versionList.length > 2) {
        // Get the two latest versions to keep
        const keepVersions = versionList.slice(0, 2)
        // Get all versions to delete
        const oldVersions = versionList.slice(2)

        // First get all files in R2 bucket
        const allFiles = await listAllFiles(env)

        // Get list of files to keep
        const keepFiles = new Set()
        for (const keepVersion of keepVersions) {
          const versionFiles = versions.versions[keepVersion].files
          versionFiles.forEach((file) => keepFiles.add(file.name))
        }

        // Delete all old version files
        for (const oldVersion of oldVersions) {
          const oldFiles = versions.versions[oldVersion].files
          for (const file of oldFiles) {
            try {
              if (file.uploaded) {
                await env.R2_BUCKET.delete(file.name)
                await addLog(env, 'INFO', `Deleted old file: ${file.name}`)
              }
            } catch (error) {
              await addLog(env, 'ERROR', `Failed to delete old file: ${file.name}`, error.message)
            }
          }
          delete versions.versions[oldVersion]
        }

        // Clean up any leftover old files
        for (const file of allFiles) {
          if (!keepFiles.has(file.name)) {
            try {
              await env.R2_BUCKET.delete(file.name)
              await addLog(env, 'INFO', `Deleted leftover file: ${file.name}`)
            } catch (error) {
              await addLog(env, 'ERROR', `Failed to delete leftover file: ${file.name}`, error.message)
            }
          }
        }

        // Save updated version database
        await env.R2_BUCKET.put(config.VERSION_DB, JSON.stringify(versions, null, 2))
      }
    } else {
      await addLog(env, 'INFO', 'All file integrity checks passed, no update needed')
    }

    return hasUpdates ? cacheData : null
  } catch (error) {
    await addLog(env, 'ERROR', 'Failed to check new version', error.message)
    throw error
  }
}

// New: Get all files list from R2 bucket
async function listAllFiles(env) {
  const files = []
  let cursor

  do {
    const listed = await env.R2_BUCKET.list({ cursor, include: ['customMetadata'] })
    files.push(...listed.objects)
    cursor = listed.cursor
  } while (cursor)

  return files
}
