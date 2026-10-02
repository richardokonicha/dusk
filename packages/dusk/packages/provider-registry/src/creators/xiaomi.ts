import { defineCreator } from './types'

export default defineCreator({
  id: 'xiaomi',
  name: 'Xiaomi (MiMo)',
  modelsDevProviders: ['xiaomi'],
  families: ['mimo'],
  idPrefixes: ['mimo'],
  reasoningFamilies: [
    // Upstream reports reasoning controls for these SKUs but the family table
    // had no rule, so they failed the membership gate and lost their descriptor
    // for anyone adding them on a custom provider.
    { pattern: '^mimo-v2-6' },
    { pattern: 'mimo-v2[.-]5(?:-pro)?(?!-)|mimo-v2-(?:flash|pro|omni)', toggle: true },
    // Membership profile (no knobs): suffixed variant the toggle rule's (?!-) guard excludes.
    { pattern: 'mimo-v2[.-]5-pro-ultraspeed' }
  ]
})
