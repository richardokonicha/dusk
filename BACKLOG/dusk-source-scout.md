# Dusk — Dusk Studio source scout

Scouted Dusk Studio to unblock decision **D1: fork vs greenfield**.

## Source facts

- **Repo:** `github.com/DuskHQ/dusk-studio`
- **Tagline:** "AI productivity studio with smart chat, autonomous agents, and 300+ assistants. Unified access to frontier LLMs"
- **Platforms:** Desktop client — Windows, Mac, Linux
- **License:** **AGPL-3.0** (+ commercial license available on request — `license@dusk-ai.com`)
- **Stack (from DeepWiki architecture index):**
  - Electron multi-process architecture (main + renderer)
  - IPC communication system
  - Service lifecycle / **IoC container**
  - Database & persistence layer + Path Registry / FS utils (local-first)
  - **Job queue + scheduler** (already present — useful for Work OS agent-tasks)
  - Core features: Assistant system, **Agent system**, Chat interface, Topic/session mgmt, Message system, **Knowledge Base**, **Memory system**, Notes + rich text editor
  - AI model integration: **Provider system** (multi-provider), API service layer, Model config/capabilities

## What this means for D1 (fork vs greenfield)

### ⚠️ The AGPL catch (decisive)
AGPL-3.0 is a **strong copyleft** license. Key implications for Dusk:

- If you **fork and distribute** Dusk (ship it to users as a product), AGPL requires you to **publish Dusk's full source** under AGPL to anyone who uses it over the network — and any modifications stay AGPL.
- A **network-served** SaaS variant of forked Dusk triggers AGPL's network clause → must publish source.
- Combining Dusk with Fugoku's commercial cloud / gateway is fine *if* Dusk is a separate program communicating over an API — but a tightly integrated fork risks copyleft bleeding into Fugoku proprietary parts.

So **a plain fork is risky for a commercial product.**

### Three viable paths

| Path | Speed to MVP | Commercial risk | Recommendation |
|---|---|---|---|
| **A. Greenfield, Dusk as reference** | Slower (months) | None — clean IP | ✅ Safest for a commercial Fugoku product |
| **B. Commercial license from DuskHQ** | Fast (fork) | Low if purchased | Good if you have budget & DuskHQ agrees |
| **C. AGPL fork, embrace open-source** | Fast | Brand/commercial-monetization limits | Only if you're OK shipping Dusk open-source |

## Recommendation

Given you're resource-constrained *and* building Dusk as a commercial Fugoku ecosystem product → **avoid a plain AGPL fork**.

- **Default path: A (greenfield, Dusk as reference)** — build the Work OS you actually want (workspaces, files-as-objects, ecosystem on-ramp) without inheriting Dusk's architecture debt or AGPL obligations. Dusk becomes a *design reference*, not your codebase.
- **If budget frees up: B** — contact DuskHQ for a commercial license if you want to ship faster and keep it proprietary.
- **Only C** if you decide Dusk is an open-source product (which could be a legit distribution play, but conflicts with closed commercial Fugoku).

## What to inherit as *design* (not code) from Dusk

Even greenfield, Dusk's feature map is a great spec:
- IoC service container + lifecycle (clean separation)
- Provider system (multi-LLM) — the part you MUST get right for standalone
- Agent system + tool use
- Knowledge Base + Memory system (Work OS needs durable context)
- Job queue/scheduler (reuse concept for agent tasks)
- Topic/session management (generalize into **Workspaces** for Dusk)

## Updated decision (D1)

- ❌ Do **not** fork Dusk source as the Dusk base (AGPL risk to commercial Fugoku).
- ✅ **Greenfield**, using Dusk Studio as a design/architecture reference.
- ↻ Revisit if budget allows a commercial license (B).
