# Troubleshooting

This guide covers common issues and how to resolve them.

## Common Issues

### Dusk will not start

- **Check system requirements**: Ensure you are running macOS 12+, Windows 10+, or a modern Linux distribution.
- **Reinstall the app**: Delete the app and reinstall from the latest release.
- **Check logs**: Open **Settings** → **Advanced** → **View Logs** for error details.

### Conversations are slow

- **Check your provider**: Some providers have higher latency than others. Try switching to a faster model.
- **Reduce context length**: Long conversation histories increase response time. Use **New Conversation** to start fresh.
- **Disable Fugoku Cloud sync**: Sync can add latency. Disable it in **Settings** → **Cloud**.

### Files will not attach

- **Check file size**: Files must be under 50MB.
- **Check format**: Ensure the file type is supported (see [Files](/guide/files)).
- **Check permissions**: Ensure Dusk has permission to access the file location.

## Provider Connection Problems

### OpenAI

- **401 Unauthorized**: Your API key is invalid or expired. Generate a new key at [platform.openai.com](https://platform.openai.com).
- **429 Rate Limited**: You have exceeded your rate limit. Wait a moment and retry, or upgrade your plan.
- **Network Error**: Ensure your firewall allows outbound HTTPS connections to `api.openai.com`.

### Anthropic

- **401 Unauthorized**: Your API key is invalid or expired. Generate a new key at [console.anthropic.com](https://console.anthropic.com).
- **529 Overloaded**: Anthropic's API is temporarily overloaded. Wait and retry.
- **Network Error**: Ensure your firewall allows outbound HTTPS connections to `api.anthropic.com`.

### Google AI

- **400 Invalid Argument**: Check that your API key is correct and has the necessary permissions.
- **403 Permission Denied**: Ensure your API key has access to the requested model.
- **Network Error**: Ensure your firewall allows outbound HTTPS connections to `generativelanguage.googleapis.com`.

### Local Models (Ollama)

- **Connection Refused**: Ensure Ollama is running at `http://localhost:11434`.
- **Model Not Found**: Pull the model first with `ollama pull <model-name>`.
- **Out of Memory**: Close other applications or use a smaller model.

### Local Models (LM Studio)

- **Connection Refused**: Ensure the LM Studio server is running and listening on the correct port.
- **Model Not Loaded**: Load a model in LM Studio before connecting.
- **CORS Error**: Enable CORS in LM Studio server settings.

## Performance Tips

### Speed Up Responses

1. **Use faster models**: Smaller models like GPT-4o-mini or Claude Haiku are faster than larger models.
2. **Reduce context**: Clear old messages or start a new conversation.
3. **Disable streaming**: Disable streaming in **Settings** → **Advanced** for bulk processing.
4. **Use local models**: For simple tasks, local models via Ollama can be faster than cloud APIs.

### Reduce Memory Usage

1. **Close unused workspaces**: Each open workspace consumes memory.
2. **Limit file attachments**: Large files increase memory usage.
3. **Disable Fugoku Cloud sync**: Sync operations use additional memory and network.

### Improve Stability

1. **Keep Dusk updated**: New versions include bug fixes and performance improvements.
2. **Limit concurrent agents**: Running multiple agents simultaneously can cause instability.
3. **Restart periodically**: Restart Dusk every few days to clear accumulated state.

## Data Backup and Restore

### Export Data

1. Open **Settings** → **Advanced**
2. Click **Export Data**
3. Choose a destination folder
4. Click **Export**

The export includes all conversations, workspace configurations, and agent settings. API keys are **not** included for security reasons.

### Import Data

1. Open **Settings** → **Advanced**
2. Click **Import Data**
3. Select a previously exported `.dusk` file
4. Click **Import**

Importing will merge data with your existing configuration. Workspace names will be suffixed with a number if they conflict.

### Manual Backup

For advanced users, you can manually copy the Dusk data directory:

- **macOS**: `~/Library/Application Support/Dusk`
- **Windows**: `%APPDATA%\Dusk`
- **Linux**: `~/.config/dusk`

### Restore from Backup

1. Close Dusk completely
2. Replace the data directory with your backup
3. Restart Dusk

### Fugoku Cloud Sync

If you use Fugoku Cloud Sync, your data is automatically backed up to the cloud. You can restore from any device by signing in with your Fugoku account.

## Getting Help

If you are still experiencing issues:

1. Check the [GitHub Issues](https://github.com/fugoku/dusk/issues) for known problems
2. Search [Discussions](https://github.com/fugoku/dusk/discussions) for community solutions
3. Open a new issue with:
   - A clear description of the problem
   - Steps to reproduce
   - Logs from **Settings** → **Advanced** → **View Logs**
   - Your OS and Dusk version
