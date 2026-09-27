# @dusk/ai-core

## 2.0.1

### Patch Changes

- upstream #14087 (1f72f98) Thanks [@DeJeune](https://github.com/DeJeune)! - fix(providers): azure-anthropic variant uses correct Anthropic toolFactories for web search

  - Add `TOutput` generic to `ProviderVariant` so `transform` output type flows to `toolFactories` and `resolveModel`
  - Add Anthropic-specific `toolFactories` to `azure-anthropic` variant (fixes `provider.tools.webSearchPreview is not a function`)
  - Fix `urlContext` factory incorrectly mapping to `webSearch` tool key instead of `urlContext`
  - Fix `BedrockExtension` `satisfies` type to use `AmazonBedrockProvider` instead of `ProviderV3`

## 2.0.0

### Major Changes

- upstream #12235 (1c0a5a9) Thanks [@DeJeune](https://github.com/DeJeune)! - Migrate to AI SDK v6 - complete rewrite of provider and middleware architecture

  - **BREAKING**: Remove all legacy API clients, middleware pipeline, and barrel `index.ts`
  - **Image generation**: Migrate to native AI SDK `generateImage`/`editImage`, remove legacy image middleware
  - **Embedding**: Migrate to AI SDK `embedMany`, remove legacy embedding clients
  - **Model listing**: Refactor `ModelListService` to Strategy Registry pattern, consolidate schema files
  - **OpenRouter image**: Native image endpoint support via `@openrouter/ai-sdk-provider` 2.3.3
  - **GitHub Copilot**: Simplify extension by removing `ProviderV2` cast and `wrapProvider`
  - **Rename**: `index_new.ts` → `AiProvider.ts`, `ModelListService.ts` → `listModels.ts`

### Patch Changes

- upstream #13787 (6b4c928) Thanks [@EurFelux](https://github.com/EurFelux)! - Add missing @openrouter/ai-sdk-provider dependency to fix package build

- upstream #12783 (336176b) Thanks [@EurFelux](https://github.com/EurFelux)! - Baseline release for previously unmanaged package changes while introducing changesets-based publishing

- Updated dependencies [336176b]:
  - @dusk/ai-sdk-provider@0.1.6
