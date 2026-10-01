import { openaiCompatible } from './types'

/**
 * Fugoku Gateway — first-party OpenAI-compatible endpoint. The API key is
 * supplied by the user at runtime; never commit one here.
 */
export default openaiCompatible({
  id: 'fugoku',
  name: 'Fugoku Gateway',
  baseUrl: 'https://open.duskin.net/v1',
  website: {
    docs: 'https://dusk.app'
  }
})
