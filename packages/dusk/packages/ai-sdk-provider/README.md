# @dusk/ai-sdk-provider

DuskLegacySub provider bundle for the [Vercel AI SDK](https://ai-sdk.dev/).  
It exposes the DuskLegacySub OpenAI-compatible entrypoints and dynamically routes Anthropic and Gemini model ids to their DuskLegacySub upstream equivalents.

## Installation

```bash
npm install ai @dusk/ai-sdk-provider @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai
# or
pnpm add ai @dusk/ai-sdk-provider @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai
```

> **Note**: This package requires peer dependencies `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, and `@ai-sdk/openai` to be installed.

## Usage

```ts
import { createDuskIn, duskIn } from '@dusk/ai-sdk-provider'

const duskInProvider = createDuskIn({
  apiKey: process.env.DUSKIN_API_KEY,
  // optional overrides:
  // baseURL: 'https://open.duskin.net/v1',
  // anthropicBaseURL: 'https://open.duskin.net/anthropic',
  // geminiBaseURL: 'https://open.duskin.net/gemini/v1beta',
})

// Chat models will auto-route based on the model id prefix:
const openaiModel = duskInProvider.chat('gpt-4o-mini')
const anthropicModel = duskInProvider.chat('claude-3-5-sonnet-latest')
const geminiModel = duskInProvider.chat('gemini-2.0-pro-exp')

const { text } = await openaiModel.invoke('Hello DuskLegacySub!')
```

The provider also exposes `completion`, `responses`, `embedding`, `image`, `transcription`, and `speech` helpers aligned with the upstream APIs.

See [AI SDK docs](https://ai-sdk.dev/providers/community-providers/custom-providers) for configuring custom providers.
