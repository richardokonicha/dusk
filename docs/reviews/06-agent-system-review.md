# 06 — Agent System Review

**Reviewer:** Agent System Engineering Agent  
**Date:** 2026-08-11  
**Scope:** Agent runtime, tool system, multi-agent orchestration, memory, lifecycle

## Verdict: APPROVED with one critical API gap

### What works

- **Agent taxonomy is clear and differentiated from Cherry.** Workspace Agent (persistent), Task Agent (job-based), Specialist (role), Orchestrator (router), System (background) — each has a distinct use case.
- **Tool system design is solid.** The `Tool` interface with `execute(params, context)` is clean. Built-in tools (read_file, write_file, list_files) are the right Phase 1 set.
- **Memory architecture** (short-term conversation + long-term SQLite + workspace artifacts) is well-layered.
- **Permission model** with filesystem/read-write/none + web + code execution + MCP servers is appropriately granular.

### Critical concern

**1. Orchestrator routing logic is placeholder-grade.**

`agent-system.md` defines `selectSpecialist()` as simple keyword matching: "code" → coder, "review" → reviewer. This will misroute constantly. A user saying "review this code" will hit the reviewer, but "write a review of the codebase" will hit the writer.

**Recommendation:** For Phase 1, the Orchestrator should default to the Workspace Agent for everything. Specialist routing is a Phase 2 enhancement that requires LLM-based classification. Don't ship keyword routing — it creates user confusion.

### Medium concerns

- **Agent config format:** The plan proposes both YAML and JSON schemas. Pick one for Phase 1. JSON is simpler (no parser dependency, native to TypeScript). YAML can be added later if users request it.
- **Tool result storage:** Tool results are stored as JSON in the `messages.tool_calls` column. For large results (file reads, code execution output), this bloat the messages table. Consider storing large tool results in the `artifacts` table and referencing them.
- **Agent lifecycle persistence:** If the app restarts while a Task Agent is running, the state is lost. The `jobs` table has status, but there's no mechanism to resume interrupted jobs. Document this as a known Phase 1 limitation.

### Minor concerns

- **MCP integration is mentioned but not specified.** What does the MCP tool wrapper look like? Plan at least a stub implementation so the architecture is clear.
- **Artifact creation events** (`artifact_created`) are emitted but not persisted to the `files` table. Ensure the event handler writes to the file registry.
