# Dusk — Vision

## One line
The primary place for all your AI work — standalone, with an optional on-ramp into the Fugoku ecosystem.

## Why Dusk exists

Most AI tools today are **a tool you open** — a chat window for one task, closed when done. Work that actually involves AI is messier: you juggle context across chats, files, scripts, agents, and model providers. Nothing holds it together.

Dusk is the **place** that holds it together. Not a chat app — a **work environment** with:

- Persistent workspaces (your stuff lives here, organized)
- Agents that use tools and remember context
- Any model provider (don't get locked into one vendor)
- Files and artifacts as first-class objects
- An ecosystem on-ramp when you need real compute (Fugoku)

## Design principles

1. **Standalone-first.** Never require a Fugoku account. Work with any OpenAI-compatible endpoint out of the box.
2. **Local-first data.** Workspace, history, and settings live on the user's machine by default. Cloud sync is opt-in.
3. **Provider-agnostic.** Switch models freely. No lock-in.
4. **Fugoku is an upgrade, not a tollgate.** Gateway routing and Cloud compute are valuable extras — Dusk's core is fully usable without them.
5. **Calm, focused, ownable.** "Dusk" — the work settles into focus here. Avoid the noisy "another AI studio" feeling.

## How it fits Fugoku

Fugoku's mission: be a big cloud + AI provider. Dusk is the **front door for the AI side**:

- **Dusk → Fugoku Gateway:** users who want unified billing, fallback, cost caps route their models through the gateway.
- **Dusk → Fugoku Cloud:** users who need GPU / compute provision it from inside Dusk.
- **Dusk → Fugoku billing:** the upgrade path converts Dusk users into Fugoku customers.

Dusk earns independently (its own pricing / distribution) *and* feeds the Fugoku funnel. Two revenue surfaces, one product.

## What success looks like (12 months)

- Dusk ships as a standalone desktop product with its own users and revenue.
- A meaningful % of Dusk users upgrade to Fugoku Gateway/Cloud.
- Dusk is recognized as "the calm work environment for AI" — distinct from the crowded "AI Studio" lane.
- Fugoku ecosystem feels coherent: **Fugoku** (sunrise / infrastructure) + **Dusk** (focus / work).

## Non-goals (for now)

- Not a browser. Not an IDE. Not an OS in the kernel sense.
- Not a hosted/SaaS web app at launch — desktop-first (lineage: Cherry Studio).
- Not a model training platform (that's Fugoku Cloud's job — Dusk *uses* compute, doesn't replace it).
