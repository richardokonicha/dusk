import { openaiCompatible } from './types'

/**
 * Kilo Gateway — an OpenAI-compatible chat-completions endpoint fronting other
 * creators' models. The API key is supplied by the user at runtime; never
 * commit one here.
 */
export default openaiCompatible({
  id: 'kilo',
  name: 'Kilo Gateway',
  baseUrl: 'https://api.kilo.ai/api/gateway',
  website: {
    docs: 'https://kilo.ai/docs'
  }
})
