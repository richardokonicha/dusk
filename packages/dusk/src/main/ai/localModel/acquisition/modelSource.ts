/**
 * Download source for model weights. HuggingFace exposes the
 * `/<repo>/resolve/<revision>/<file>` route.
 *
 * Download-time only. Inference never consults it: models load by absolute path, which is
 * what keeps them off the network entirely.
 */
export type ModelSourceId = 'huggingface'

interface ModelSource {
  /** e.g. `https://huggingface.co`. */
  remoteHost: string
  /** e.g. `{model}/resolve/{revision}`. */
  remotePathTemplate: string
  /** Branch/tag — `main` on HuggingFace. */
  revision: string
}

const SOURCES: Record<ModelSourceId, ModelSource> = {
  huggingface: {
    remoteHost: 'https://huggingface.co',
    remotePathTemplate: '{model}/resolve/{revision}',
    revision: 'main'
  }
}

/** Single-source order — the downstream mirror-fallback structure stays intact with one entry. */
export const MODEL_SOURCE_ORDER: [ModelSourceId, ...ModelSourceId[]] = ['huggingface']

/**
 * Direct download URL for `<repo>/<file>` on HuggingFace, e.g.
 * `https://huggingface.co/PaddlePaddle/PP-OCRv6_medium_det_onnx/resolve/main/inference.onnx`.
 */
export function resolveModelFileUrl(id: ModelSourceId, repo: string, file: string): string {
  const source = SOURCES[id]
  const repoPath = source.remotePathTemplate.replace('{model}', repo).replace('{revision}', source.revision)
  return `${source.remoteHost}/${repoPath}/${file}`
}
