# 01 — Architecture Review

**Reviewer:** Architect Agent  
**Date:** 2026-08-11  
**Scope:** System Architecture, Data Models, IPC Contracts, Service Container

## Verdict: APPROVED with conditions

The architecture is sound, but I have critical concerns about three areas.

### What works

- **Electron + Vite + React + TypeScript** is the right stack for a desktop-first Work OS. It mirrors Cherry's proven architecture while giving us full control.
- **Service Container (IoC)** pattern is clean and testable. Dependencies flow explicitly through registration, not magic.
- **IPC channel registry** with type-safe request/response + event streaming is exactly what we need. The channel list is comprehensive and well-organized.
- **Repository pattern** over better-sqlite3 is correct. Wrapping raw SQL in typed repos gives us testability without an ORM abstraction tax.
- **Event Bus** for internal main-process decoupling is lightweight and appropriate.

### Critical concerns

**1. Database: better-sqlite3 vs Drizzle ORM inconsistency**

The architecture doc (`architecture.md`) shows raw `better-sqlite3` with manual repository classes. But `backend-architecture.md` imports `drizzle-orm/better-sqlite3` and uses Drizzle query builders. The `mobile-strategy.md` says mobile will use `expo-sqlite` + Drizzle.

**Conflict:** Are we using raw better-sqlite3 or Drizzle? Mixing both creates maintenance burden and schema drift.

**Recommendation:** Standardize on Drizzle ORM across both desktop and mobile. The schema definitions, migrations, and type-safe queries justify the dependency. Mobile uses `drizzle-orm/expo-sqlite`, desktop uses `drizzle-orm/better-sqlite3`. Same schema source of truth.

**2. Agent Runtime: async generator antipattern**

Both `architecture.md` and `agent-system.md` define `invoke()` as `AsyncIterable<AgentEvent>`. This forces every consumer to implement async iteration. The `backend-architecture.md` JobQueueService calls `this.agentRuntime.invoke(job.agentId, job.input)` as if it returns a Promise, not an async iterable — this is a **bug in the design**.

**Recommendation:** Split into two methods:
- `invokeStream()` returning `AsyncIterable<AgentEvent>` for chat/UI streaming
- `invoke()` returning `Promise<AgentResult>` for job queue and batch operations

**3. File watcher (chokidar) on workspace root**

`backend-architecture.md` starts chokidar on the entire workspace path. For workspaces with large codebases or node_modules, this will consume significant resources.

**Recommendation:** Use a `.duskignore` file (similar to `.gitignore`) and pass explicit ignore patterns to chokidar. Default ignore: `.git`, `node_modules`, `.dusk`, `__pycache__`, `.DS_Store`.

### Medium concerns

- **No encryption at rest plan.** The `SecureStorageService` references `safeStorage` but doesn't define a migration path for existing unencrypted data. API keys stored in plaintext SQLite today become a liability if the machine is compromised.
- **No session/reconnection handling.** The streaming model assumes the renderer stays connected. If the renderer crashes and restarts, in-flight streams are lost. Need a session recovery mechanism.
- **JobQueueService references `this.agentRuntime`** but doesn't have it injected — it only receives `eventBus`. This is a wiring gap in `backend-architecture.md`.

### Suggested priority

1. Resolve Drizzle vs raw SQLite decision (this week)
2. Fix AgentRuntime async API design (this week)
3. Add chokidar ignore patterns (next sprint)
4. Plan encryption-at-rest migration (Phase 1 polish)
