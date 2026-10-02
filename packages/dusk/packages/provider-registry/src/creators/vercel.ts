import { defineCreator } from './types'

export default defineCreator({
  id: 'vercel',
  name: 'Vercel',
  modelsDevProviders: ['vercel'],
  idPrefixes: ['v0'],
  // Upstream reports reasoning controls for these SKUs but the family table had
  // no rule, so they failed the membership gate and lost their descriptor for
  // anyone adding them on a custom provider.
  reasoningFamilies: [
    { pattern: '^muse-spark' },
    { pattern: '^interfaze' },
    { pattern: '^laguna-s' },
    { pattern: '^(?:namazu|ember-1|arrow-2|fugu-)' }
  ]
})
