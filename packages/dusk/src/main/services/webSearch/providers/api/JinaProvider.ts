import { loggerService } from '@logger'
import { isAbortError } from '@main/utils/error'
import { defaultAppHeaders } from '@main/utils/http'
import type { WebSearchExecutionConfig, WebSearchResponse } from '@shared/data/types/webSearch'
import { withoutTrailingSlash } from '@shared/utils/api'
import { net } from 'electron'
import * as z from 'zod'

import { resolveProviderApiHost } from '../../utils/provider'
import { BaseWebSearchProvider } from '../base/BaseWebSearchProvider'
import type { BaseSearchContext } from '../base/context'

const logger = loggerService.withContext('JinaProvider')

const JinaReaderResponseSchema = z.looseObject({
  code: z.union([z.number(), z.string()]).optional(),
  status: z.union([z.number(), z.string()]).optional(),
  data: z
    .looseObject({
      title: z.string().optional(),
      content: z.string().optional(),
      text: z.string().optional(),
      url: z.string().optional()
    })
    .optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional()
})

const JinaSearchResponseSchema = z.looseObject({
  code: z.union([z.number(), z.string()]).optional(),
  status: z.union([z.number(), z.string()]).optional(),
  data: z
    .array(
      z.looseObject({
        title: z.string().optional(),
        content: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional()
      })
    )
    .optional(),
  results: z
    .array(
      z.looseObject({
        title: z.string().optional(),
        content: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional()
      })
    )
    .optional()
})

type JinaContext = BaseSearchContext & {
  apiKey: string
  requestUrl: string
  fallbackRequestUrl?: string
}

export class JinaProvider extends BaseWebSearchProvider {
  async searchKeywords(
    query: string,
    config: WebSearchExecutionConfig,
    httpOptions?: RequestInit
  ): Promise<WebSearchResponse> {
    const context = await this.prepareSearchKeywordsContext(query, config, httpOptions)
    const payload = await this.executeSearchKeywords(context)

    return this.buildSearchKeywordsResponse(context, payload)
  }

  async fetchUrls(
    query: string,
    config: WebSearchExecutionConfig,
    httpOptions?: RequestInit
  ): Promise<WebSearchResponse> {
    const context = await this.prepareFetchUrlsContext(query, config, httpOptions)

    try {
      const payload = await this.executeFetchUrls(context)
      return this.buildFetchUrlsResponse(context, payload)
    } catch (error) {
      if (!context.fallbackRequestUrl || context.signal?.aborted || isAbortError(error)) {
        throw error
      }

      logger.warn('Jina Reader preferred host failed; retrying alternate built-in host', {
        providerId: this.provider.id,
        error: error instanceof Error ? error.message : String(error)
      })
      const fallbackContext = { ...context, requestUrl: context.fallbackRequestUrl }
      const payload = await this.executeFetchUrls(fallbackContext)

      return this.buildFetchUrlsResponse(fallbackContext, payload)
    }
  }

  private async prepareSearchKeywordsContext(
    query: string,
    config: WebSearchExecutionConfig,
    httpOptions?: RequestInit
  ): Promise<JinaContext> {
    const normalizedQuery = query.trim()
    const apiHost = resolveProviderApiHost(this.provider, 'searchKeywords')

    return {
      apiKey: this.resolveApiKey(),
      query: normalizedQuery,
      maxResults: config.maxResults,
      requestUrl: `${withoutTrailingSlash(apiHost)}/${encodeURIComponent(normalizedQuery)}`,
      signal: httpOptions?.signal ?? undefined
    }
  }

  private async prepareFetchUrlsContext(
    query: string,
    config: WebSearchExecutionConfig,
    httpOptions?: RequestInit
  ): Promise<JinaContext> {
    const url = query.trim()
    const apiHost = resolveProviderApiHost(this.provider, 'fetchUrls')

    return {
      // Jina Reader works without a key (rate-limited); a key is optional and only raises the limits.
      apiKey: this.resolveApiKey(false),
      query: url,
      maxResults: config.maxResults,
      // Jina Reader expects the raw target URL after the host; encoding it changes the API path semantics.
      requestUrl: `${withoutTrailingSlash(apiHost)}/${url}`,
      signal: httpOptions?.signal ?? undefined
    }
  }

  private async executeSearchKeywords(context: JinaContext) {
    const response = await net.fetch(context.requestUrl, {
      method: 'GET',
      headers: {
        ...defaultAppHeaders(),
        Accept: 'application/json',
        Authorization: `Bearer ${context.apiKey}`
      },
      signal: context.signal
    })

    if (!response.ok) {
      await this.throwHttpError('Jina search failed', response)
    }

    return this.parseJsonResponse(response, JinaSearchResponseSchema, {
      operation: 'search',
      requestUrl: context.requestUrl
    })
  }

  private async executeFetchUrls(context: JinaContext) {
    const headers: Record<string, string> = {
      ...defaultAppHeaders(),
      Accept: 'application/json',
      'X-Retain-Images': 'none'
    }
    // Only authenticate when a key is configured; Jina Reader accepts anonymous requests.
    if (context.apiKey) {
      headers.Authorization = `Bearer ${context.apiKey}`
    }

    const response = await net.fetch(context.requestUrl, {
      method: 'GET',
      headers,
      signal: context.signal
    })

    if (!response.ok) {
      await this.throwHttpError('Jina Reader fetch failed', response)
    }

    return this.parseJsonResponse(response, JinaReaderResponseSchema, {
      operation: 'reader',
      requestUrl: context.requestUrl
    })
  }

  private buildSearchKeywordsResponse(
    context: JinaContext,
    payload: z.infer<typeof JinaSearchResponseSchema>
  ): WebSearchResponse {
    const results = payload.data || payload.results || []

    return {
      query: context.query,
      providerId: this.provider.id,
      capability: 'searchKeywords',
      inputs: [context.query],
      results: results.slice(0, context.maxResults).map((result) => ({
        title: result.title?.trim() || '',
        content: result.content?.trim() || result.description?.trim() || '',
        url: result.url || '',
        sourceInput: context.query
      }))
    }
  }

  private buildFetchUrlsResponse(
    context: JinaContext,
    payload: z.infer<typeof JinaReaderResponseSchema>
  ): WebSearchResponse {
    const data = payload.data || payload
    const content = data.content?.trim() || data.text?.trim() || ''

    if (!content) {
      throw new Error(`Jina Reader returned empty content for ${context.query}`)
    }

    return {
      query: context.query,
      providerId: this.provider.id,
      capability: 'fetchUrls',
      inputs: [context.query],
      results: [
        {
          title: data.title?.trim() || context.query,
          content,
          url: data.url || context.query,
          sourceInput: context.query
        }
      ]
    }
  }
}
