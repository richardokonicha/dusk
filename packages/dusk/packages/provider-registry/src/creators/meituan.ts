import { defineCreator } from './types'

export default defineCreator({
  id: 'meituan',
  name: 'Meituan',
  families: ['longcat'],
  idPrefixes: ['longcat'],
  // Upstream reports reasoning controls for these SKUs but the family table had
  // no rule, so they failed the membership gate and lost their descriptor for
  // anyone adding them on a custom provider.
  reasoningFamilies: [{ pattern: '^longcat-2[.-]0$', toggle: true }, { pattern: '^longcat-' }]
})
