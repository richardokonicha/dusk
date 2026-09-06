/**
 * In-memory binary media served to renderers over the `dusk-media://` scheme.
 * This barrel is the module's only public door.
 */
export { MediaProtocolService } from './MediaProtocolService'
export { DUSK_MEDIA_SCHEME_DECLARATION } from './registerSchemes'
export { DUSK_MEDIA_SCHEME, MediaKind } from './types'
