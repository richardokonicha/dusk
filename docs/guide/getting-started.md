# Getting Started

## Installation

### macOS

```bash
brew install --cask fugoku/dusk/dusk
```

Or download the latest `.dmg` from the [releases page](https://github.com/fugoku/dusk/releases).

### Windows

Download the latest `.exe` installer from the [releases page](https://github.com/fugoku/dusk/releases).

### Linux

```bash
# AppImage
chmod +x Dusk-*.AppImage && ./Dusk-*.AppImage

# .deb
sudo dpkg -i dusk_*.deb
```

## First Launch

When you open Dusk for the first time, you will be greeted by the welcome screen. From here you can:

1. Select a theme (Crescent, Dusk, Midnight, or Light)
2. Choose whether to enable Fugoku Cloud sync
3. Set up your first AI provider

## Setting Up a Provider

Dusk works with a variety of AI providers. To get started:

1. Open Settings → Providers
2. Click **Add Provider**
3. Select your provider and enter your API key
4. Click **Test Connection** to verify

Supported providers include OpenAI, Anthropic, Google AI, and local models via Ollama or LM Studio.

## Creating Your First Workspace

1. Click **New Workspace** in the sidebar
2. Name your workspace and choose an icon
3. Select which provider this workspace will use
4. Start a conversation

Workspaces keep your files, agents, and conversation history isolated from each other.

## First Conversation

1. Select your workspace
2. Type a message in the composer and press **Enter**
3. Use `Shift+Enter` for a new line
4. Attach files with the attachment button or drag-and-drop

Use `/` in the composer to see available commands and shortcuts.
