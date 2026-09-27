import { describe, expect, it } from 'vitest'

import { MODEL_SOURCE_ORDER, resolveModelFileUrl } from '../modelSource'

describe('modelSource', () => {
  it('exports a single-source order', () => {
    expect(MODEL_SOURCE_ORDER).toEqual(['huggingface'])
  })

  it('builds HuggingFace file URLs with the {model}/resolve/{revision} route', () => {
    expect(resolveModelFileUrl('huggingface', 'PaddlePaddle/PP-OCRv6_medium_det_onnx', 'inference.onnx')).toBe(
      'https://huggingface.co/PaddlePaddle/PP-OCRv6_medium_det_onnx/resolve/main/inference.onnx'
    )
  })
})
