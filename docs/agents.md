# Dusk — Agent Architecture

## One line

Agents in Dusk are **workers in your workspace**, not just chat personas. They have context, tools, file access, and job lifecycles — designed for professional output, not casual conversation.

## Core principle

Cherry Studio shipped 300+ pre-configured assistants. Dusk ships **agent roles** that do actual work inside workspaces. The difference: Cherry's assistants are prompt templates; Dusk's agents are active participants with memory, tools, and artifact ownership.

---

## Agent taxonomy

### 1. Workspace Agent (primary)
- **Bound to a workspace/project** — inherits its files, history, and context
- Remembers what you're building across sessions
- Reads/writes workspace artifacts directly
- Default agent you get when you create a workspace

### 2. Task Agent (job)
- Spawned for a specific deliverable: "write the spec," "audit this codebase," "draft the Q3 report"
- Runs multi-step with tool use (MCP, shell, file operations)
- Reports back with artifacts, not just chat messages
- Has a lifecycle: queued → running → completed/failed
- Visible in workspace activity feed

### 3. Specialist Agent (role)
- Configured for a domain with system prompts, tool permissions, and model preferences
- Examples: `coder`, `reviewer`, `writer`, `analyst`, `researcher`, `devops`
- Reusable across workspaces
- Can be shared across team workspaces (Fugoku-tier feature)

### 4. Orchestrator Agent (router)
- Routes incoming requests to the right specialist or workspace agent
- Handles multi-agent workflows (e.g., researcher → writer → reviewer)
- Surfaces routing decisions so users can override

### 5. System Agents (background)
- No chat interface — runs workspace maintenance
- Examples: `indexer` (knowledge base), `archiver` (old conversations), `sync-agent` (Fugoku Cloud sync)
- Visible in settings/logs, not main chat

---

## Agent capabilities (per-agent config)

| Capability | Notes |
|---|---|
| Model selection | Per-agent override or inherit workspace default |
| Tools | Allowlist: MCP servers, file system, web, code execution, DB queries |
| Memory | Short-term (conversation) + long-term (workspace notes/artifacts) |
| Permissions | Read-only / read-write / admin within workspace |
| Artifact ownership | Agents can produce outputs that become workspace files |
| Scheduling | Task agents can be queued or triggered by events (webhook, schedule, Fugoku) |

---

## Agent runtime model

```
User request
    │
    ▼
Orchestrator
    │
    ├──► Workspace Agent (default, context-aware)
    │
    ├──► Task Agent (spawned, job-based)
    │       │
    │       ├── tool calls (MCP, filesystem, code)
    │       ├── artifact writes
    │       └── status updates
    │
    └──► Specialist Agent (domain, reusable)
            │
            ├── read workspace artifacts
            ├── return structured output
            └── leave artifacts for other agents
```

### Lifecycle

1. **Idle** — agent exists with config, no active work
2. **Active/Streaming** — responding in chat
3. **Working** — task agent executing multi-step job, progress visible
4. **Awaiting input** — needs user decision (permission, clarification)
5. **Completed** — job done, artifacts delivered
6. **Failed** — error state, retry available

---

## How agents differ from Cherry Studio

| | Cherry Studio assistants | Dusk agents |
|---|---|---|
| Scope | Prompt templates | Workspace-bound workers |
| Context | Single conversation | Cross-session workspace memory |
| Output | Text in chat | Text + artifacts (files, code, data) |
| Lifecycle | Always-on chat persona | Job-based (spawn/complete) or persistent |
| Tools | Basic function calling | Full MCP + filesystem + code + DB |
| Collaboration | Solo | Multi-agent orchestrations |
| Professional framing | "AI assistant" | "Agent with deliverables" |

---

## Professional positioning

For a professional audience, agents must:

1. **Be predictable** — clear permissions, visible actions, auditable outputs
2. **Produce artifacts** — work results in files/reports, not just chat bubbles
3. **Respect workspace boundaries** — agents can't leak data across workspaces by default
4. **Support handoff** — one agent's output is another agent's input (artifact chains)
5. **Be cost-transparent** — token usage and provider routing visible per agent/job

---

## Implementation phases

### Phase 1 (MVP)
- Workspace Agent (default, persistent)
- Basic tool use (MCP, file read/write)
- Artifact output (save agent responses as workspace files)
- Simple task spawning (chat-triggered, not queued)

### Phase 2 (Fugoku on-ramp)
- Task Agent with queue/scheduler
- Specialist Agent templates
- Multi-agent orchestrator
- Fugoku Gateway routing per agent

### Phase 3 (Fugoku Cloud)
- Background System Agents
- Team-shared Specialist Agents
- Event-triggered agents (webhooks, schedules)

---

## Open questions

1. Agent config format — YAML schema, JSON, or UI builder?
2. How much of Cherry's 300+ assistant library maps to Specialist Agents vs. is discarded?
3. Should agents be shareable as templates (like Cherry's assistant sharing)?
4. Local-first: where does agent memory live? SQLite same as workspace, or separate store?
