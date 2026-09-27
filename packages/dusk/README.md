<div align="center">

# Dusk

**Work OS for AI** — a desktop workspace for agents, chats, files, and knowledge, forked from an AGPL-3.0 open-source desktop AI client.

Windows · macOS · Linux

</div>

---

Dusk is a standalone desktop client: bring your own API keys, run local models, and keep your data on your machine. No account, no telemetry, no vendor cloud.

## Features

- **Providers**: OpenAI, Anthropic, Google Gemini, and any OpenAI-compatible endpoint; local models via Ollama / LM Studio
- **Agents**: agent system with sessions, scheduling, and MCP (Model Context Protocol) tool servers
- **Workspaces**: project-scoped agents and knowledge bases
- **Knowledge**: knowledge bases with local embeddings
- **Data**: portable SQLite storage, full backup / restore, WebDAV sync
- **i18n**: 26 languages

## Development

```bash
pnpm install
pnpm lint        # oxlint + eslint + typecheck + i18n + format
pnpm dev         # start in dev mode
pnpm build       # electron-vite production build
pnpm test        # full vitest suite
```

Node ≥ 24.11.1 and pnpm ≥ 11 are pinned in `package.json`.

See [docs/contrib/development.md](docs/contrib/development.md) and [AGENTS.md](AGENTS.md) for conventions.

## License

AGPL-3.0 — see [LICENSE](LICENSE). Dusk is a fork; the upstream project's name and branding belong to their owners and are not used here.

## Project

Dusk is developed by Fugoku. It is not affiliated with, endorsed by, or distributed by the upstream project.
