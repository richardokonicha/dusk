# Architecture

This document provides an overview of the Dusk Work OS architecture.

## Overview

Dusk is a local-first work environment for AI, built with a modular architecture that separates concerns into distinct layers.

## Layers

### Desktop Shell

The desktop shell is the primary user interface, built with a modern cross-platform framework. It manages:

- Window lifecycle
- Menu bar and tray integration
- Native OS integrations
- Local IPC

### Core

The core layer contains the shared business logic, state management, and data models used across the application.

- **State Management**: Centralized state with persistence
- **Workspace Manager**: Handles workspace creation, switching, and isolation
- **Provider Registry**: Manages AI provider connections and routing
- **File Manager**: Handles file attachments, storage, and context

### Provider Layer

The provider layer abstracts AI services behind a unified interface. Each provider implements the same contract but handles authentication, streaming, and error handling differently.

- OpenAI / Azure OpenAI
- Anthropic
- Google AI
- Local (Ollama, LM Studio)
- OpenRouter

### Agent System

The agent system runs autonomous workflows. Agents are defined as configurations that specify:

- Tools and integrations
- System prompts
- Execution limits
- Model selection

The agent runtime executes tasks, manages tool calls, and streams results back to the UI.

### Fugoku Cloud (Optional)

Fugoku Cloud is an optional synchronization layer. When enabled, it provides:

- Cross-device sync
- Backup and restore
- Shared workspaces (team feature)

All cloud communication is encrypted end-to-end. Cloud sync is disabled by default.

## Data Flow

```
User Input → Desktop Shell → Core → Provider Layer → AI Service
                                      ↓
                               Agent System → Tool Execution → Response
                                      ↓
                                Fugoku Cloud (optional)
```

## Persistence

Dusk uses a local-first approach. All data is stored on disk in a structured format:

- SQLite for structured data (conversations, settings)
- Filesystem for binary data (attachments, exports)
- JSON for configuration and workspace definitions

## Security

- No telemetry or analytics by default
- All secrets stored in the OS keychain
- Local data encrypted when supported by the OS
- No external network calls unless explicitly configured
