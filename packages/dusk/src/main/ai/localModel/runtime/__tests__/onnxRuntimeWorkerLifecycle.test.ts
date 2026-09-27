import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Worker } from 'node:worker_threads'

import { describe, expect, it } from 'vitest'

// True only where a bundled onnxruntime-node binding exists for this platform —
// upstream ships none for darwin-x64, so the load-under-termination contract is
// untestable there (same gate pattern as the anydoc smoke tests).
const hasNativeBinding = (() => {
  try {
    return existsSync(
      createRequire(import.meta.url)
        .resolve('onnxruntime-node/package.json')
        .replace(/package\.json$/, `bin/napi-v6/${process.platform}/${process.arch}/onnxruntime_binding.node`)
    )
  } catch {
    return false
  }
})()

async function loadTransformersInWorker(): Promise<unknown> {
  const worker = new Worker(
    `
      const { parentPort } = require('node:worker_threads')

      try {
        const transformers = require('@huggingface/transformers')
        parentPort.postMessage({ hasPipeline: typeof transformers.pipeline === 'function' })
      } catch (error) {
        parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) })
      }
    `,
    { eval: true }
  )

  try {
    const [result] = await once(worker, 'message')
    return result
  } finally {
    await worker.terminate()
  }
}

describe.skipIf(!hasNativeBinding)('transformers worker lifecycle', () => {
  it('loads again after a worker using its ONNX native binding is terminated', async () => {
    await expect(loadTransformersInWorker()).resolves.toEqual({ hasPipeline: true })
    await expect(loadTransformersInWorker()).resolves.toEqual({ hasPipeline: true })
  })
})
