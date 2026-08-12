# Dusk — Standalone vs Fugoku-tied

Dusk is **standalone-first**. The Fugoku ecosystem is an upgrade path, not a dependency. This doc defines exactly what works alone vs. what unlocks with Fugoku.

## Capability matrix

| Capability | Standalone | With Fugoku |
|---|---|---|
| Chat with any model (OpenAI, Anthropic, local, custom endpoints) | ✅ | ✅ |
| Multiple agents / assistants | ✅ | ✅ |
| Tool use & function calling | ✅ | ✅ |
| MCP server integrations | ✅ | ✅ |
| Local file workspace | ✅ | ✅ |
| Conversation history & search | ✅ | ✅ |
| Multi-provider model switching | ✅ | ✅ |
| **Unified LLM routing (fallback, cost caps, one key)** | ❌ | ✅ via Fugoku Gateway |
| **Unified billing across many providers** | ❌ | ✅ via Fugoku Gateway |
| **Cloud sync of workspace across devices** | ❌ | ✅ via Fugoku Cloud (future) |
| **Provision GPU / compute instances from inside Dusk** | ❌ | ✅ via Fugoku Cloud (future) |
| **Team / shared workspaces** | ❌ | ✅ via Fugoku IAM (future) |

## What "standalone" guarantees

A user installs Dusk, points it at their own provider keys (or a local model), and gets a full work environment. Zero Fugoku account, zero lock-in. This is non-negotiable — it protects Dusk's independent brand and adoption.

## What "Fugoku-tied" adds (the upgrade path)

1. **Fugoku Gateway preset** (ship first)
   - One provider entry: `Fugoku Gateway`
   - Routes requests → `fugoku-ai-gateway` (LiteLLM)
   - User benefit: one key, fallback across providers, cost caps, one bill
   - Fugoku benefit: routing revenue + customer relationship

2. **Fugoku Cloud** (later)
   - "Need more compute?" → provision GPU/instances from inside Dusk
   - Maps to `fugoku-cloud-api` compute endpoints already built

3. **Fugoku Sync / Teams** (later)
   - Workspace sync across devices; shared team workspaces via Fugoku IAM

## Principle

> If a feature only makes sense with Fugoku, it's an **upgrade**, gated behind connecting a Fugoku account. If it makes sense on its own, it's **core** and ships standalone.
