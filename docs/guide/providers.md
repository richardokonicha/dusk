# Providers

Providers are the AI services that power Dusk conversations. Dusk supports a wide range of providers through a unified interface.

## Adding a Provider

1. Open **Settings** → **Providers**
2. Click **Add Provider**
3. Select a provider from the list
4. Enter your API key
5. Click **Test Connection**

## Supported Providers

### OpenAI

- Models: GPT-4o, GPT-4o-mini, GPT-4 Turbo, o1, o1-mini, o3, o3-mini
- Requires an OpenAI API key

### Anthropic

- Models: Claude Sonnet 4.5, Claude Opus 4, Claude Sonnet 4, Claude Haiku 3.5, Claude 3.5 Sonnet, Claude 3.5 Haiku
- Requires an Anthropic API key

### Google AI

- Models: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash, Gemini 1.5 Pro
- Requires a Google AI API key

### Azure OpenAI

- Models: Any Azure-hosted OpenAI model
- Requires endpoint URL and API key

### Local Models (Ollama)

- Models: Any model available in your local Ollama instance
- Ensure Ollama is running at `http://localhost:11434`

### Local Models (LM Studio)

- Models: Any model loaded in LM Studio
- Ensure LM Studio server is running

### OpenRouter

- Models: Hundreds of models through a single API key
- Supports OpenAI-compatible models

## Provider Configuration

Each provider can be configured with:

- **Display name**: How it appears in the UI
- **API key**: Your authentication key
- **Base URL**: Custom endpoint (for OpenAI-compatible providers)
- **Default model**: The model used when this provider is selected
- **Timeout**: Request timeout in milliseconds

## Testing Connections

Use the **Test Connection** button to verify that Dusk can reach the provider and authenticate successfully. If the test fails, check your API key and network settings.

## Troubleshooting

- **401 Unauthorized**: Check that your API key is correct and has not expired
- **429 Rate Limited**: You have exceeded your rate limit. Wait a moment and retry.
- **Network Error**: Ensure your firewall allows outbound HTTPS connections to the provider's API endpoint.
