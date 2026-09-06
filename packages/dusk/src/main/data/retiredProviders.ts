/** Provider ids whose upstream services are gone or unsupported by Dusk. Legacy backups carrying these ids migrate, but the rows are dropped by the v2 migrators. */
const RETIRED_PROVIDER_IDS = new Set(['cephalon', 'github', 'tokenflux', 'duskai', 'duskin'])

export function isRetiredProvider(providerId: string | null | undefined, presetProviderId?: string | null): boolean {
  return (
    (providerId != null && RETIRED_PROVIDER_IDS.has(providerId)) ||
    (presetProviderId != null && RETIRED_PROVIDER_IDS.has(presetProviderId))
  )
}
