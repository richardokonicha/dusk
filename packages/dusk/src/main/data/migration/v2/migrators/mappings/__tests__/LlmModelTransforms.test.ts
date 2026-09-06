import { mockMainLoggerService } from '@test-mocks/MainLoggerService'
import { beforeEach, describe, expect, it } from 'vitest'

import { transformLlmModelIds } from '../LlmModelTransforms'

describe('LlmModelTransforms', () => {
  beforeEach(() => {
    mockMainLoggerService.warn.mockClear()
  })

  describe('transformLlmModelIds', () => {
    it('transforms all 3 model fields to UniqueModelIds', () => {
      const sources = {
        defaultModel: { id: 'gpt-4', provider: 'openai', name: 'GPT-4' },
        quickModel: { id: 'claude-3-haiku', provider: 'anthropic', name: 'Haiku' },
        translateModel: { id: 'qwen-max', provider: 'qwen', name: 'Qwen Max' }
      }

      const result = transformLlmModelIds(sources)

      expect(result).toEqual({
        'chat.default_model_id': 'openai::gpt-4',
        'feature.quick_assistant.model_id': 'anthropic::claude-3-haiku',
        'feature.translate.model_id': 'qwen::qwen-max'
      })
    })

    it('leaves model preferences unset when model objects are missing', () => {
      const result = transformLlmModelIds({})

      expect(result).toEqual({
        'chat.default_model_id': '',
        'feature.quick_assistant.model_id': '',
        'feature.translate.model_id': ''
      })
    })

    it('handles mix of valid and missing models', () => {
      const sources = {
        defaultModel: { id: 'gpt-4', provider: 'openai' }
        // quickModel and translateModel not present
      }

      const result = transformLlmModelIds(sources)

      expect(result['chat.default_model_id']).toBe('openai::gpt-4')
      expect(result['feature.quick_assistant.model_id']).toBe('')
      expect(result['feature.translate.model_id']).toBe('')
    })

    it('handles model with incomplete data (missing provider)', () => {
      const sources = {
        defaultModel: { id: 'gpt-4' } // no provider
      }

      const result = transformLlmModelIds(sources)

      expect(result['chat.default_model_id']).toBe('')
    })

    it('uses shared model conversion behavior for passthrough, trimming, and invalid providers', () => {
      const result = transformLlmModelIds({
        defaultModel: { id: ' openai::gpt-4 ', provider: 'openai' },
        quickModel: { id: 'gpt-4', provider: 'o::p' },
        translateModel: 'not-an-object'
      })

      expect(result).toEqual({
        'chat.default_model_id': 'openai::gpt-4',
        'feature.quick_assistant.model_id': '',
        'feature.translate.model_id': ''
      })
      expect(mockMainLoggerService.warn).toHaveBeenCalledWith(
        'Legacy model preference could not be parsed; leaving model selection unset',
        {
          preferenceKey: 'feature.quick_assistant.model_id',
          valueType: 'object',
          id: 'gpt-4',
          provider: 'o::p'
        }
      )
      expect(mockMainLoggerService.warn).toHaveBeenCalledWith(
        'Legacy model preference could not be parsed; leaving model selection unset',
        {
          preferenceKey: 'feature.translate.model_id',
          valueType: 'string'
        }
      )
    })

    it('preserves retired legacy provider references for migration inspection', () => {
      const result = transformLlmModelIds({
        defaultModel: { id: 'old-default', provider: 'duskai' },
        quickModel: { id: 'old-quick', provider: 'duskai' },
        translateModel: { id: 'old-translate', provider: 'duskai' }
      })

      expect(result).toEqual({
        'chat.default_model_id': 'duskai::old-default',
        'feature.quick_assistant.model_id': 'duskai::old-quick',
        'feature.translate.model_id': 'duskai::old-translate'
      })
    })

    it('trims legacy provider ids before converting them', () => {
      const result = transformLlmModelIds({
        defaultModel: { id: 'old-default', provider: ' duskai ' }
      })

      expect(result['chat.default_model_id']).toBe('duskai::old-default')
    })
  })
})
