/**
 * Ambient globals available to a Dusk mini app. Dusk 2.x.
 *
 * Drop this file into your project and reference it from `tsconfig.json`
 * (`"include": ["dusk.d.ts", "src"]`) — nothing to import, `dusk` is a global.
 *
 * The method set is checked against the host's routing table in CI
 * (`src/main/features/miniApp/runtime/__tests__/apiSurface.test.ts`); parameter and
 * return shapes are documented in `capabilities.md`.
 */

declare global {
  const duskMeta: DuskApi

  type DuskErrorName =
    | 'PermissionDenied'
    | 'QuotaExceeded'
    | 'RateLimited'
    | 'Unavailable'
    | 'InvalidArgument'
    | 'Cancelled'
    | 'Internal'

  /** Every rejection from `dusk.*` is this exact plain object — not an `Error` instance, no stack, no host paths. */
  interface DuskError {
    name: DuskErrorName
    message: string
  }

  interface DuskApi {
    app: DuskApp
    ai: DuskAi
    storage: DuskStorage
    file: DuskFile
    notification: DuskNotification
    network: DuskNetwork
    clipboard: DuskClipboard
    /** The only inbound channel. Returns an unsubscribe function. */
    on<E extends DuskEvent>(event: E, handler: (payload: DuskEventPayload[E]) => void): () => void
  }

  type DuskEvent = 'app.visibilityChange' | 'app.localeChange'

  interface DuskEventPayload {
    /** The host hides pooled apps with `display: none`, so Page Visibility never fires — this does. */
    'app.visibilityChange': { visible: boolean }
    /** `navigator.language` does not update inside the sandbox — this does. */
    'app.localeChange': { locale: string }
  }

  /** Text only — there is no image input channel, which is why `vision` is not reported. */
  interface DuskChatParams {
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
    /** Whether a reasoning model may think first. `'off'` when omitted; ignored by models that cannot switch. */
    reasoning?: 'on' | 'off'
    /** Which of the user's two model slots answers; `'default'` when omitted. */
    model?: 'default' | 'quick'
  }

  /** Byte and item counts for one namespace, alongside the limits they are measured against. */
  interface DuskUsage {
    bytes: number
    count: number
    bytesLimit: number
    countLimit: number
  }

  interface DuskAi {
    /** Resolves when the stream ends; the text arrives through `onChunk` as plain deltas. */
    chat(params: DuskChatParams, options: { onChunk: (text: string) => void; callId?: string }): Promise<{ ok: true }>
    /** Stops a call started with `callId`. Unknown ids are ignored, not errors. */
    cancel(callId: string): Promise<{ ok: true }>
    /**
     * Describes the slot you are about to call — never the model behind it.
     *
     * An unusable slot is a VALUE, not a rejection: `available: false` means the user has
     * configured no model there (or deleted the one they had), so branch on it rather than
     * wrapping the call in a `catch`. Only a `model` you made up rejects.
     */
    getCapabilities(params?: {
      model?: 'default' | 'quick'
    }): Promise<{ available: false } | { available: true; reasoning: boolean; contextWindow: number | null }>
  }

  interface DuskStorage {
    get(key: string): Promise<{ value: string | null }>
    set(key: string, value: string): Promise<{ ok: true }>
    delete(key: string): Promise<{ ok: true }>
    keys(): Promise<{ keys: string[] }>
    usage(): Promise<DuskUsage>
  }

  interface DuskFile {
    /** `data` is base64 — the bridge carries no binary types. */
    save(name: string, data: string): Promise<{ ok: true }>
    load(name: string): Promise<{ data: string | null }>
    list(): Promise<{ names: string[] }>
    /** Idempotent: deleting a name that does not exist still resolves `ok`. */
    delete(name: string): Promise<{ ok: true }>
    usage(): Promise<DuskUsage>
    /**
     * Hands one of your files to the user through the host's save dialog; `{ saved: false }`
     * when they cancel. Only while the app is visible, one dialog at a time.
     */
    export(name: string, options?: { suggestedName?: string }): Promise<{ saved: boolean }>
  }

  interface DuskApp {
    /** No `theme`: use `matchMedia('(prefers-color-scheme: dark)')`, which also reports changes. */
    getInfo(): Promise<{ appId: string; version: string; hostVersion: string; locale: string }>
    /** Every DECLARED leaf and whether it is granted right now. Needs no permission itself. */
    getPermissions(): Promise<Record<string, boolean>>
  }

  interface DuskNotification {
    /** Over-long `title` / `body` are truncated, not rejected. */
    show(params: { title: string; body?: string }): Promise<{ ok: true }>
  }

  /** Plain text, both ways, and only while the app is visible and has keyboard focus — a background app is refused. */
  interface DuskClipboard {
    /** Whatever text is on the clipboard, clipped to 1 MB; `''` when there is none. */
    read(): Promise<{ text: string }>
    write(params: { text: string }): Promise<{ ok: true }>
  }

  interface DuskFetchParams {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
    /** `Host`, `Cookie`, `Origin` and the rest of the forbidden set are REJECTED, not stripped. */
    headers?: Record<string, string>
    /** base64 — the bridge carries no binary types. */
    body?: string
  }

  interface DuskNetwork {
    /**
     * The only way out. https only, no port, no IP literal, and only hosts this app's
     * manifest declares. A non-2xx status is a RESULT, not a rejection — only unreachable,
     * over-limit and not-permitted reject.
     */
    fetch(params: DuskFetchParams): Promise<{ status: number; headers: Record<string, string>; body: string }>
  }
}

export {}
