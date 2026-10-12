import { openaiCompatible } from './_api'
import { defineCreator } from './types'

export default defineCreator({
  id: 'stepfun',
  name: 'StepFun',
  fetchModels: openaiCompatible('stepfun', 'STEPFUN_API_KEY'),
  modelsDevProviders: ['stepfun', 'stepfun-ai'],
  idPrefixes: ['step'],
  // Upstream reports reasoning controls for these SKUs but the family table had
  // no rule, so they failed the membership gate and lost their descriptor for
  // anyone adding them on a custom provider.
  reasoningFamilies: [{ pattern: 'step-3' }, { pattern: 'step-r1-v-mini' }, { pattern: '^step-5-' }]
})
