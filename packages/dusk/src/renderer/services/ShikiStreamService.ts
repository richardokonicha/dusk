import { loggerService } from '@logger'
import { DEFAULT_LANGUAGES, DEFAULT_THEMES, getHighlighter, loadLanguageAndThemeIfNeeded } from '@renderer/utils/shiki'
import { LRUCache } from 'lru-cache'
import type { HighlighterGeneric, ThemedToken } from 'shiki/core'

import type { ShikiStreamTokenizerOptions } from './ShikiStreamTokenizer'
import { ShikiStreamTokenizer } from './ShikiStreamTokenizer'

const logger = loggerService.withContext('ShikiStreamService')

const SERVICE_CONFIG = {
  // LRU cache configuration
  TOKENIZER_CACHE: {
    MAX_SIZE: 100, // Maximum cache entries
    TTL: 1000 * 60 * 30 // 30 minute expiry (ms)
  },

  // Degradation strategy configuration
  DEGRADATION_CACHE: {
    MAX_SIZE: 500, // Maximum records
    TTL: 1000 * 60 * 60 * 12 // 12 hour auto-expiry (ms)
  },

  // Worker initialization configuration
  WORKER: {
    MAX_INIT_RETRY: 2, // Maximum initialization retries
    REQUEST_TIMEOUT: {
      INIT: 5000, // Initialization timeout (ms)
      HIGHLIGHT: 30000, // Highlight timeout (ms)
      DEFAULT: 10000 // Default timeout (ms)
    }
  }
}

export type ShikiPreProperties = {
  class: string
  style: string
  tabindex: number
}

/**
 * Code chunk highlight result
 *
 * @param lines All highlighted lines (including stable and unstable)
 * @param recall Number of lines to recall, -1 means recall all lines
 */
export interface HighlightChunkResult {
  lines: ThemedToken[][]
  recall: number
}

/**
 * Shiki code highlighting service
 *
 * - Supports streaming code highlighting.
 * - Prefers Worker for highlight requests.
 */
class ShikiStreamService {
  // Main thread highlighter and tokenizers
  private highlighter: HighlighterGeneric<any, any> | null = null

  // Tokenizer map keyed by callerId-language-theme
  private tokenizerCache = new LRUCache<string, ShikiStreamTokenizer>({
    max: SERVICE_CONFIG.TOKENIZER_CACHE.MAX_SIZE,
    ttl: SERVICE_CONFIG.TOKENIZER_CACHE.TTL,
    updateAgeOnGet: true,
    dispose: (value) => {
      if (value) value.clear()
    }
  })

  // Cache processed content per callerId
  private codeCache = new LRUCache<string, string>({
    max: SERVICE_CONFIG.TOKENIZER_CACHE.MAX_SIZE,
    ttl: SERVICE_CONFIG.TOKENIZER_CACHE.TTL,
    updateAgeOnGet: true
  })

  // Worker-related resources
  private worker: Worker | null = null
  private workerInitPromise: Promise<void> | null = null
  private workerInitRetryCount: number = 0
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void
      reject: (reason?: any) => void
    }
  >()
  private requestId = 0

  // Degradation strategy variables, tracks callerIds with worker failures
  private workerDegradationCache = new LRUCache<string, boolean>({
    max: SERVICE_CONFIG.DEGRADATION_CACHE.MAX_SIZE,
    ttl: SERVICE_CONFIG.DEGRADATION_CACHE.TTL
  })

  constructor() {
    // Lazy initialization
  }

  /**
   * Check if using Worker highlighting. External code should not rely on this.
   */
  public hasWorkerHighlighter(): boolean {
    return !!this.worker && !this.workerInitPromise
  }

  /**
   * Check if using main thread highlighting. External code should not rely on this.
   */
  public hasMainHighlighter(): boolean {
    return !!this.highlighter
  }

  /**
   * Initialize Worker
   */
  private async initWorker(): Promise<void> {
    if (typeof Worker === 'undefined') return
    if (this.workerInitPromise) return this.workerInitPromise
    if (this.worker) return

    if (this.workerInitRetryCount >= SERVICE_CONFIG.WORKER.MAX_INIT_RETRY) {
      logger.debug('ShikiStream worker initialization failed too many times, stop trying')
      return
    }

    this.workerInitPromise = (async () => {
      try {
        // Dynamic worker import
        const WorkerModule = await import('../workers/shikiStream.worker?worker')
        this.worker = new WorkerModule.default()

        // Set message handler
        this.worker.onmessage = (event) => {
          const { id, type, result, error } = event.data

          // Find corresponding request
          const pendingRequest = this.pendingRequests.get(id)
          if (!pendingRequest) return

          this.pendingRequests.delete(id)

          if (type === 'error') {
            pendingRequest.reject(new Error(error))
          } else if (type === 'init-result') {
            pendingRequest.resolve({ success: true })
            this.workerInitRetryCount = 0
          } else {
            pendingRequest.resolve(result)
          }
        }

        // Initialize worker
        await this.sendWorkerMessage({
          type: 'init',
          languages: DEFAULT_LANGUAGES,
          themes: DEFAULT_THEMES
        })
        this.workerInitRetryCount = 0
      } catch (error) {
        this.worker?.terminate()
        this.worker = null
        this.workerInitRetryCount++
        throw error
      } finally {
        this.workerInitPromise = null
      }
    })()

    return this.workerInitPromise
  }

  /**
   * Send message to Worker and wait for reply
   */
  private sendWorkerMessage(message: any): Promise<any> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not available'))
    }

    const id = this.requestId++
    let timerId: ReturnType<typeof setTimeout>
    let settled = false

    const promise = new Promise((resolve, reject) => {
      const safeResolve = (value: any) => {
        if (!settled) {
          settled = true
          clearTimeout(timerId)
          this.pendingRequests.delete(id)
          resolve(value)
        }
      }

      const safeReject = (reason?: any) => {
        if (!settled) {
          settled = true
          clearTimeout(timerId)
          this.pendingRequests.delete(id)
          reject(reason)
        }
      }

      this.pendingRequests.set(id, { resolve: safeResolve, reject: safeReject })

      // Set different timeouts based on operation type
      const getTimeoutForMessageType = (type: string): number => {
        switch (type) {
          case 'init':
            return SERVICE_CONFIG.WORKER.REQUEST_TIMEOUT.INIT
          case 'highlight':
          case 'highlight-html':
            return SERVICE_CONFIG.WORKER.REQUEST_TIMEOUT.HIGHLIGHT
          case 'cleanup':
          case 'dispose':
          default:
            return SERVICE_CONFIG.WORKER.REQUEST_TIMEOUT.DEFAULT
        }
      }

      const timeout = getTimeoutForMessageType(message.type)

      // Set timeout handler
      timerId = setTimeout(() => {
        // If highlight operation times out, code block is too long, record callerId for degradation
        if (message.type === 'highlight' && message.callerId) {
          this.workerDegradationCache.set(message.callerId, true)
          safeReject(new Error(`Worker ${message.type} request timeout for callerId ${message.callerId}`))
        } else {
          safeReject(new Error(`Worker ${message.type} request timeout`))
        }
      }, timeout)
    })

    try {
      this.worker.postMessage({ id, ...message })
    } catch (error) {
      const pendingRequest = this.pendingRequests.get(id)
      if (pendingRequest) {
        pendingRequest.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    return promise
  }

  /**
   * Ensure highlighter is configured
   * @param language Language
   * @param theme Theme
   */
  private async ensureHighlighterConfigured(
    language: string,
    theme: string
  ): Promise<{ loadedLanguage: string; loadedTheme: string }> {
    if (!this.highlighter) {
      this.highlighter = await getHighlighter()
    }

    return loadLanguageAndThemeIfNeeded(this.highlighter, language, theme)
  }

  /**
   * Get Shiki pre tag properties
   *
   * Run a simple hast result and extract properties attribute.
   * Can be replaced if a more stable method exists.
   * @param language Language
   * @param theme Theme
   * @returns pre tag properties
   */
  async getShikiPreProperties(language: string, theme: string): Promise<ShikiPreProperties> {
    const { loadedLanguage, loadedTheme } = await this.ensureHighlighterConfigured(language, theme)

    if (!this.highlighter) {
      throw new Error('Highlighter not initialized')
    }

    const hast = this.highlighter.codeToHast('1', {
      lang: loadedLanguage,
      theme: loadedTheme
    })

    // @ts-ignore hack
    return hast.children[0].properties as ShikiPreProperties
  }

  /**
   * Highlight streaming code output, caller passes full code content, gets incremental highlight result.
   *
   * - Detects diff between current content and last processed content.
   * - If tail append, only transmit delta (best performance; check here if issues).
   * - If not append, reset tokenizer and process full content.
   *
   * Caller handles recall.
   * @param code Full code content
   * @param language Language
   * @param theme Theme
   * @param callerId Caller ID
   * @returns Highlight result, recall -1 means recall all lines
   */
  async highlightStreamingCode(
    code: string,
    language: string,
    theme: string,
    callerId: string
  ): Promise<HighlightChunkResult> {
    const cacheKey = `${callerId}-${language}-${theme}`
    const lastContent = this.codeCache.get(cacheKey) || ''

    let isAppend = false

    if (code.length === lastContent.length) {
      // Content unchanged, return empty result
      if (code === lastContent) {
        return { lines: [], recall: 0 }
      }
    } else if (code.length > lastContent.length) {
      // Length increased, likely append
      isAppend = code.startsWith(lastContent)
    }

    try {
      let result: HighlightChunkResult

      if (isAppend) {
        // Streaming append, only transmit delta
        const chunk = code.slice(lastContent.length)
        result = await this.highlightCodeChunk(chunk, language, theme, callerId)
      } else {
        // Non-append change, reset and process full content
        this.cleanupTokenizers(callerId)
        this.codeCache.delete(cacheKey) // Clear cache

        result = await this.highlightCodeChunk(code, language, theme, callerId)

        // Recall all lines
        result = {
          ...result,
          recall: -1
        }
      }

      // Update cache after successful processing
      this.codeCache.set(cacheKey, code)
      return result
    } catch (error) {
      // On failure, don't update cache, preserve previous state
      logger.error('Failed to highlight streaming code:', error as Error)
      throw error
    }
  }

  /**
   * One-shot static highlight, returns shiki codeToHtml HTML string (not ThemedToken lines).
   *
   * Prefers Worker (static highlight long occupied main thread, hence migration);
   * Falls back to main thread on failure, no permanent degradation (no tokenizer state to lose).
   * @param code Code content
   * @param language Language
   * @param theme Theme
   * @returns Highlighted HTML string
   */
  async highlightCodeToHtml(code: string, language: string, theme: string): Promise<string> {
    // The worker rejects an empty language; 'text' (shiki's plain language)
    // is the natural degradation instead of a doomed round-trip.
    const lang = language || 'text'
    if (!this.hasWorkerHighlighter()) {
      try {
        await this.initWorker()
      } catch (error) {
        logger.warn('Failed to initialize worker, falling back to main thread:', error as Error)
      }
    }

    if (this.hasWorkerHighlighter()) {
      try {
        const html = await this.sendWorkerMessage({
          type: 'highlight-html',
          chunk: code,
          language: lang,
          theme
        })
        return html as string
      } catch (error) {
        logger.error('Worker highlight-html failed, falling back to main thread:', error as Error)
      }
    }

    const { loadedLanguage, loadedTheme } = await this.ensureHighlighterConfigured(lang, theme)
    if (!this.highlighter) {
      throw new Error('Highlighter not initialized')
    }
    return this.highlighter.codeToHtml(code, { lang: loadedLanguage, theme: loadedTheme })
  }

  /**
   * Highlight code chunk, returns all ThemedToken lines for this highlight
   *
   * Prefers Worker, falls back to main thread on failure.
   * Caller handles recall.
   * @param chunk Code content
   * @param language Language
   * @param theme Theme
   * @param callerId Caller ID, identifies different component instances
   * @returns ThemedToken lines
   */
  async highlightCodeChunk(
    chunk: string,
    language: string,
    theme: string,
    callerId: string
  ): Promise<HighlightChunkResult> {
    // Check if callerId needs degradation
    if (this.workerDegradationCache.has(callerId)) {
      return this.highlightWithMainThread(chunk, language, theme, callerId)
    }

    // Initialize worker
    if (!this.worker) {
      try {
        await this.initWorker()
      } catch (error) {
        logger.warn('Failed to initialize worker, falling back to main thread:', error as Error)
      }
    }

    // If Worker available, prefer Worker
    if (this.hasWorkerHighlighter()) {
      try {
        const result = await this.sendWorkerMessage({
          type: 'highlight',
          callerId,
          chunk,
          language,
          theme
        })
        return result
      } catch (error) {
        // Worker failed, record callerId and permanently degrade to main thread
        // FIXME: If this happens, streaming highlight syntax state is lost, currently handled by degradation
        this.workerDegradationCache.set(callerId, true)
        logger.error(
          `Worker highlight failed for callerId ${callerId}, permanently falling back to main thread:`,
          error as Error
        )
      }
    }

    // Use main thread
    return this.highlightWithMainThread(chunk, language, theme, callerId)
  }

  /**
   * Process code highlight on main thread
   * @param chunk Code content
   * @param language Language
   * @param theme Theme
   * @param callerId Caller ID
   * @returns Highlight result
   */
  private async highlightWithMainThread(
    chunk: string,
    language: string,
    theme: string,
    callerId: string
  ): Promise<HighlightChunkResult> {
    try {
      const tokenizer = await this.getStreamTokenizer(callerId, language, theme)

      const result = await tokenizer.enqueue(chunk)

      // Merge stable and unstable lines as all lines for this highlight
      return {
        lines: [...result.stable, ...result.unstable],
        recall: result.recall
      }
    } catch (error) {
      logger.error('Failed to highlight code chunk:', error as Error)

      // Simple fallback
      const fallbackToken: ThemedToken = { content: chunk || '', color: '#000000', offset: 0 }
      return {
        lines: [[fallbackToken]],
        recall: 0
      }
    }
  }

  /**
   * Get or create tokenizer
   * @param callerId Caller ID
   * @param language Language
   * @param theme Theme
   * @returns tokenizer instance
   */
  private async getStreamTokenizer(callerId: string, language: string, theme: string): Promise<ShikiStreamTokenizer> {
    // Create composite key
    const cacheKey = `${callerId}-${language}-${theme}`

    // Return existing if present
    if (this.tokenizerCache.has(cacheKey)) {
      return this.tokenizerCache.get(cacheKey)!
    }

    // Ensure highlighter configured
    const { loadedLanguage, loadedTheme } = await this.ensureHighlighterConfigured(language, theme)

    if (!this.highlighter) {
      throw new Error('Highlighter not initialized')
    }

    // Create new tokenizer
    const options: ShikiStreamTokenizerOptions = {
      highlighter: this.highlighter,
      lang: loadedLanguage,
      theme: loadedTheme
    }

    const tokenizer = new ShikiStreamTokenizer(options)
    this.tokenizerCache.set(cacheKey, tokenizer)

    return tokenizer
  }

  /**
   * Clean up tokenizers for specific caller
   * @param callerId Caller ID
   */
  cleanupTokenizers(callerId: string): void {
    // Try cleaning Worker tokenizers first
    if (this.hasWorkerHighlighter()) {
      this.sendWorkerMessage({
        type: 'cleanup',
        callerId
      }).catch((error) => {
        logger.error('Failed to cleanup worker tokenizer:', error as Error)
      })
    }

    // Clean corresponding content cache
    for (const key of this.codeCache.keys()) {
      if (key.startsWith(`${callerId}-`)) {
        this.codeCache.delete(key)
      }
    }

    // Clean main thread tokenizers, remove all cache entries starting with callerId
    for (const key of this.tokenizerCache.keys()) {
      if (key.startsWith(`${callerId}-`)) {
        this.tokenizerCache.delete(key)
      }
    }
  }

  /**
   * Dispose all resources
   */
  dispose() {
    if (this.worker) {
      this.sendWorkerMessage({ type: 'dispose' }).catch((error) => {
        logger.warn('Failed to dispose worker:', error as Error)
      })
      this.worker.terminate()
      this.worker = null
      this.pendingRequests.clear()
      this.requestId = 0
    }

    this.workerDegradationCache.clear()
    this.tokenizerCache.clear()
    this.codeCache.clear()

    // Don't dispose highlighter directly since it's managed by AsyncInitializer
    // Just clear reference
    this.highlighter = null
    this.workerInitPromise = null
    this.workerInitRetryCount = 0
  }
}

export const shikiStreamService = new ShikiStreamService()
