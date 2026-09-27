# @dusk/ai-core

Dusk AI Core is a unified AI Provider interface package based on Vercel AI SDK, providing a powerful abstraction layer and plugin architecture for AI applications.

## ✨ Core Highlights

### 🏗️ Elegant Architecture Design

- **Simplified Layering**: `models` (model layer) → `runtime` (runtime layer), clear separation of concerns
- **Function-First**: Avoids over-abstraction, providing a clean and intuitive API
- **Type Safety**: Full TypeScript support, directly reusing AI SDK's type system
- **Minimal Wrapping**: Directly uses AI SDK interfaces, avoiding redundant definitions and performance overhead

### 🔌 Powerful Plugin System

- **Lifecycle Hooks**: Supports extension points across the full request lifecycle
- **Stream Transformation**: Implements stream processing based on AI SDK's `experimental_transform`
- **Plugin Categories**: First, Sequential, and Parallel hook types for different scenarios
- **Built-in Plugins**: webSearch, providerTool, and other out-of-the-box functionality

### 🌐 Unified Multi-Provider Interface

- **Extensible Registration**: Supports custom Provider registration for unlimited extensibility
- **Unified Configuration**: Single configuration interface simplifies multi-Provider management

### 🚀 Multiple Usage Patterns

- **Functional Calls**: Direct function calls for simple scenarios
- **Executor Instances**: Reusable executors for complex scenarios
- **Static Factory**: Convenient static creation methods
- **Native Compatibility**: Fully compatible with AI SDK's native Provider Registry

### 🔮 Future-Ready

- **Agent-Ready**: Architecture reserves space for OpenAI Agents SDK integration
- **Modular Design**: Independent package structure for cross-project reuse
- **Progressive Migration**: Can gradually migrate from existing AI SDK code

## Features

- 🚀 Unified AI Provider interface
- 🔄 Dynamic import support
- 🛠️ TypeScript support
- 📦 Powerful plugin system
- 🌍 Built-in webSearch (OpenAI, Google, Anthropic, xAI)
- 🎯 Multiple usage patterns (functional/instance/static factory)
- 🔌 Extensible Provider registration system
- 🧩 Complete middleware support
- 📊 Plugin statistics and debugging

## Supported Providers

Based on [AI SDK officially supported providers](https://ai-sdk.dev/providers/ai-sdk-providers):

**Core Providers (built-in support):**

- OpenAI
- Anthropic
- Google Generative AI
- OpenAI-Compatible
- xAI (Grok)
- Azure OpenAI
- DeepSeek

**Extended Providers (via registration API):**

- Google Vertex AI
- ...
- Custom Provider

## Installation

```bash
npm install @dusk/ai-core ai @ai-sdk/google @ai-sdk/openai
```

### React Native

If using this package in a React Native project, add the following configuration to `metro.config.js`:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Add support for @dusk/ai-core
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']
config.resolver.platforms = ['ios', 'android', 'native', 'web']

module.exports = config
```

You'll also need to install the AI SDK providers you want to use:

```bash
npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

## Usage Examples

### Basic Usage

```typescript
import { AiCore } from '@dusk/ai-core'

// Create OpenAI executor
const executor = AiCore.create('openai', {
  apiKey: 'your-api-key'
})

// Stream generation
const result = await executor.streamText('gpt-4', {
  messages: [{ role: 'user', content: 'Hello!' }]
})

// Non-stream generation
const response = await executor.generateText('gpt-4', {
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

### Convenience Functions

```typescript
import { createOpenAIExecutor } from '@dusk/ai-core'

// Quickly create OpenAI executor
const executor = createOpenAIExecutor({
  apiKey: 'your-api-key'
})

// Use executor
const result = await executor.streamText('gpt-4', {
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

### Multi-Provider Support

```typescript
import { AiCore } from '@dusk/ai-core'

// Support multiple AI providers
const openaiExecutor = AiCore.create('openai', { apiKey: 'openai-key' })
const anthropicExecutor = AiCore.create('anthropic', { apiKey: 'anthropic-key' })
const googleExecutor = AiCore.create('google', { apiKey: 'google-key' })
const xaiExecutor = AiCore.create('xai', { apiKey: 'xai-key' })
```

### Extended Provider Registration

For non-built-in providers, you can extend support via the registration API:

```typescript
import { registerProvider, AiCore } from '@dusk/ai-core'

// Method 1: Import and register third-party provider
import { createGroq } from '@ai-sdk/groq'

registerProvider({
  id: 'groq',
  name: 'Groq',
  creator: createGroq,
  supportsImageGeneration: false
})

// Now you can use Groq
const groqExecutor = AiCore.create('groq', { apiKey: 'groq-key' })

// Method 2: Dynamic import registration
registerProvider({
  id: 'mistral',
  name: 'Mistral AI',
  import: () => import('@ai-sdk/mistral'),
  creatorFunctionName: 'createMistral'
})

const mistralExecutor = AiCore.create('mistral', { apiKey: 'mistral-key' })
```

## 🔌 Plugin System

AI Core provides a powerful plugin system supporting extensions across the full request lifecycle.

### Built-in Plugins

#### webSearchPlugin - Web Search Plugin

Provides unified web search capabilities for different AI Providers:

```typescript
import { webSearchPlugin } from '@dusk/ai-core/built-in/plugins'

const executor = AiCore.create('openai', { apiKey: 'your-key' }, [
  webSearchPlugin({
    openai: {
      /* OpenAI search config */
    },
    anthropic: { maxUses: 5 },
    google: {
      /* Google search config */
    },
    xai: {
      mode: 'on',
      returnCitations: true,
      maxSearchResults: 5,
      sources: [{ type: 'web' }, { type: 'x' }, { type: 'news' }]
    }
  })
])
```

#### loggingPlugin - Logging Plugin

Provides detailed request logging:

```typescript
import { createLoggingPlugin } from '@dusk/ai-core/built-in/plugins'

const executor = AiCore.create('openai', { apiKey: 'your-key' }, [
  createLoggingPlugin({
    logLevel: 'info',
    includeParams: true,
    includeResult: false
  })
])
```

### Custom Plugins

Creating custom plugins is straightforward:

```typescript
import { definePlugin } from '@dusk/ai-core'

const customPlugin = definePlugin({
  name: 'custom-plugin',
  enforce: 'pre', // 'pre' | 'post' | undefined

  // Log when request starts
  onRequestStart: async (context) => {
    console.log(`Starting request for model: ${context.modelId}`)
  },

  // Transform request parameters
  transformParams: async (params, context) => {
    // Add custom system message
    if (params.messages) {
      params.messages.unshift({
        role: 'system',
        content: 'You are a helpful assistant.'
      })
    }
    return params
  },

  // Process response result
  transformResult: async (result, context) => {
    // Add metadata
    if (result.text) {
      result.metadata = {
        processedAt: new Date().toISOString(),
        modelId: context.modelId
      }
    }
    return result
  }
})

// Use custom plugin
const executor = AiCore.create('openai', { apiKey: 'your-key' }, [customPlugin])
```

### Using AI SDK Native Provider Registry

> https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry

In addition to the built-in provider management, you can use AI SDK's native `createProviderRegistry` to build your own provider registry.

#### Basic Usage Example

```typescript
import { createClient } from '@dusk/ai-core'
import { createProviderRegistry } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

// 1. Create AI SDK native registry
export const registry = createProviderRegistry({
  // register provider with prefix and default setup:
  anthropic,

  // register provider with prefix and custom setup:
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
})

// 2. Create client, 'openai' can be empty or providerId (built-in provider)
const client = PluginEnabledAiClient.create('openai', {
  apiKey: process.env.OPENAI_API_KEY
})

// 3. Method 1: Use built-in logic (traditional way)
const result1 = await client.streamText('gpt-4', {
  messages: [{ role: 'user', content: 'Hello with built-in logic!' }]
})

// 4. Method 2: Use custom registry (flexible way)
const result2 = await client.streamText({
  model: registry.languageModel('openai:gpt-4'),
  messages: [{ role: 'user', content: 'Hello with custom registry!' }]
})

// 5. Supported overload methods
await client.generateObject({
  model: registry.languageModel('openai:gpt-4'),
  schema: z.object({ name: z.string() }),
  messages: [{ role: 'user', content: 'Generate a user' }]
})

await client.streamObject({
  model: registry.languageModel('anthropic:claude-3-opus-20240229'),
  schema: z.object({ items: z.array(z.string()) }),
  messages: [{ role: 'user', content: 'Generate a list' }]
})
```

#### Combining with Plugin System

Even more powerful is combining custom registries with Dusk's plugin system:

```typescript
import { PluginEnabledAiClient } from '@dusk/ai-core'
import { createProviderRegistry } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

// 1. Create client with plugins
const client = PluginEnabledAiClient.create(
  'openai',
  {
    apiKey: process.env.OPENAI_API_KEY
  },
  [LoggingPlugin, RetryPlugin]
)

// 2. Create custom registry
const registry = createProviderRegistry({
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
})

// 3. Method 1: Built-in logic + full plugin system
await client.streamText('gpt-4', {
  messages: [{ role: 'user', content: 'Hello with plugins!' }]
})

// 4. Method 2: Custom registry + limited plugin support
await client.streamText({
  model: registry.languageModel('anthropic:claude-3-opus-20240229'),
  messages: [{ role: 'user', content: 'Hello from Claude!' }]
})

// 5. Supported methods
await client.generateObject({
  model: registry.languageModel('openai:gpt-4'),
  schema: z.object({ name: z.string() }),
  messages: [{ role: 'user', content: 'Generate a user' }]
})

await client.streamObject({
  model: registry.languageModel('openai:gpt-4'),
  schema: z.object({ items: z.array(z.string()) }),
  messages: [{ role: 'user', content: 'Generate a list' }]
})
```

#### Advantages of Hybrid Usage

- **Flexibility**: Choose between built-in logic or custom registry as needed
- **Compatibility**: Fully compatible with AI SDK's `createProviderRegistry` API
- **Progressive**: Gradually migrate existing code without full rewrite
- **Plugin Support**: Custom registry still benefits from partial plugin system features
- **Best Practices**: Combines advantages of both approaches — dynamic loading performance and unified registry convenience

## 📚 Related Resources

- [Vercel AI SDK Documentation](https://ai-sdk.dev/)
- [Dusk Project](https://gitlab.com/fugoku.inc/dusk)
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers)

## Future Versions

- 🔮 Multi-Agent Orchestration
- 🔮 Visual Plugin Configuration
- 🔮 Real-time Monitoring and Analytics
- 🔮 Cloud Plugin Sync

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file

---

**Dusk AI Core** - Making AI Development Simpler, More Powerful, More Flexible 🚀