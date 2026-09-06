import { application } from '@application'
import { loggerService } from '@logger'

const logger = loggerService.withContext('RegionService')

const CACHE_KEY = 'region.egressCountry'
const CACHE_TTL = 10 * 60 * 1000
// Global default: Dusk ships without CN-region infrastructure (see AGENTS.md no-CN rule).
const DEFAULT_COUNTRY = 'US'

type CachedEgressRegion = {
  country: string
  /** ProxyService's applied-config key in effect when this country was detected. */
  proxyKey: string | null
}

/**
 * Detects the user's egress country (and the "is in China" shorthand) by
 * geolocating the request's public IP, then caches the result.
 *
 * The detected country reflects the *egress* IP, which depends on the active
 * proxy — so the cache is keyed on ProxyService's applied-config key and
 * invalidates the moment the app's proxy changes, with a TTL backstop for
 * egress changes the app cannot observe. Single-flight dedups concurrent
 * detections, including those arriving via the system.get_ip_country IPC.
 */
class RegionService {
  private inflight: Promise<string> | null = null

  /** Egress country code (e.g. 'CN', 'US'); defaults to 'US' on any failure. */
  async getCountry(): Promise<string> {
    const proxyKey = application.get('ProxyService').appliedProxyKey
    const cached = application.get('CacheService').get<CachedEgressRegion>(CACHE_KEY)
    if (cached && cached.proxyKey === proxyKey) {
      return cached.country
    }

    // Dedup concurrent detections — callers share one in-flight request.
    this.inflight ??= this.detectAndCache(proxyKey).finally(() => {
      this.inflight = null
    })
    return this.inflight
  }

  /** True when the egress country resolves to China. */
  async isInChina(): Promise<boolean> {
    const country = await this.getCountry()
    return country.toLowerCase() === 'cn'
  }

  private async detectAndCache(proxyKey: string | null): Promise<string> {
    try {
      const country = await this.fetchCountry()
      application.get('CacheService').set<CachedEgressRegion>(CACHE_KEY, { country, proxyKey }, CACHE_TTL)
      return country
    } catch (error) {
      logger.error('Failed to get IP address information:', error as Error)
      return DEFAULT_COUNTRY
    }
  }

  private async fetchCountry(): Promise<string> {
    return DEFAULT_COUNTRY
  }
}

export const regionService = new RegionService()
