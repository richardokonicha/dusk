import { defineCreator } from './types'

export default defineCreator({
  id: 'arceeai',
  name: 'Arcee AI',
  families: ['trinity'],
  idPrefixes: ['trinity', 'afm', 'arcee'],
  // Upstream reports reasoning controls for these SKUs but the family table had
  // no rule, so they failed the membership gate and lost their descriptor for
  // anyone adding them on a custom provider.
  reasoningFamilies: [{ pattern: '^trinity-' }]
})
