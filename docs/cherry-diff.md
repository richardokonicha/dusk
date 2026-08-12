# Dusk — Cherry Studio diff

Dusk begins from a **Cherry Studio** lineage (desktop AI client / workbench) and grows into a Work OS. This doc tracks what we **keep**, **customize**, and **add**. (To be refined after a source-level review of Cherry Studio.)

## Keep from Cherry Studio (proven, don't rebuild)

- Desktop shell (Electron-class) — cross-platform, local-first
- Multi-provider model configuration (OpenAI-compatible + native provider adapters)
- Assistant/agent configuration with system prompts & params
- Conversation management, history, search
- Message rendering (markdown, code, artifacts)
- MCP server support
- Settings / provider-key management UX
- Theming

## Customize (rebrand + reshape)

| Area | From Cherry → Dusk |
|---|---|
| Name & branding | Cherry Studio → **Dusk** (logo, palette: dusk/twilight tones) |
| Framing | "AI chat client" → "Work OS / primary place for AI work" |
| First-run | Default to workspace view, not empty chat |
| Provider presets | Add **Fugoku Gateway** as a first-class preset |
| Tone/copy | Calm, focused — avoid "studio" / "creator" vocabulary |

## Add (the Work OS layer — Dusk's differentiators)

These are what make Dusk a Work OS rather than a chat client:

1. **Workspaces** — persistent project spaces holding related chats, files, and agents together (not loose conversations).
2. **Files as first-class objects** — attach, reference, and persist files in the workspace; agents read/write them.
3. **Artifact store** — durable outputs (docs, code, images) organized per workspace.
4. **Ecosystem on-ramp** — one-click Fugoku Gateway connect; later, Fugoku Cloud compute from inside Dusk.
5. **Local-first sync model** — workspace on disk; optional Fugoku Cloud sync (future).
6. **Agent tasks/jobs** — longer-running agent operations with status, not just single-turn chat (future).

## Decide later (needs source review)

- Fork Cherry source outright vs. greenfield with Cherry as reference?
- Which provider adapters to keep vs. slim down for launch?
- How much of Cherry's MCP/tooling to inherit vs. rework?
- Licensing model for Dusk distribution.

> **Note:** Source scout done — Cherry is AGPL-3.0. We build greenfield using Cherry as a *design reference*, not a code fork. Details: `BACKLOG/cherry-source-scout.md`.
