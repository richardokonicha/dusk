# 12 — Backend / Desktop Review

**Reviewer:** Backend / Desktop Engineering Agent  
**Date:** 2026-08-11  
**Scope:** Electron main process, services, database, file system, security

## Verdict: APPROVED with security and reliability gaps

### What works

- **Service container wiring** is correct and follows dependency order (DB → settings → provider → file → job queue → agent runtime).
- **Provider service abstraction** with built-in OpenAI, Anthropic, Gemini, Ollama, and Custom adapters covers the Phase 1 requirement.
- **File service with chokidar** provides real-time workspace file tracking. This is essential for agent tool use.

### Critical concerns

**1. `sandbox: false` in BrowserWindow is a security regression.**

`backend-architecture.md` line 31 sets `sandbox: false` because "better-sqlite3 requires this." This disables Chrome's site isolation for the renderer, significantly increasing XSS impact.

**Recommendation:** Evaluate `utilityProcess` (Electron 30+) to run better-sqlite3 in a separate utility process with sandboxed renderer. If Electron 30 is too new, accept `sandbox: false` as a Phase 1 tradeoff but document the risk and plan to enable sandbox in Phase 2.

**2. No database migration versioning.**

`backend-architecture.md` runs migrations from a single file (`001_initial.sql`). There's no version tracking or rollback mechanism. When we need to add columns (e.g., `files.version` for sync), we can't track which migrations have been applied.

**Recommendation:** Use Drizzle Kit's migration system. It generates versioned migration files and tracks applied migrations in a `__drizzle_migrations` table. This is the correct solution for both desktop and mobile.

### Medium concerns

- **SecureStorageService is incomplete.** The `get()` method calls `safeStorage?.encryptString(key)` — this encrypts the key name, not the value. The implementation is backwards. Should be:
  ```typescript
  async set(key: string, value: string): Promise<void> {
    const encrypted = safeStorage.encryptString(value);
    await this.db.set(key, encrypted);
  }
  async get(key: string): Promise<string | null> {
    const encrypted = await this.db.get(key);
    if (!encrypted) return null;
    return safeStorage.decryptString(encrypted);
  }
  ```
- **JobQueueService has a circular dependency.** It references `this.agentRuntime` in `executeJob()` but isn't injected with it. Fix by adding `agentRuntime` to the constructor.
- **EventBus is a simple in-memory pub/sub.** If the app restarts, all in-flight events are lost. For Phase 1 this is acceptable, but document it as a limitation.

### Minor concerns

- **No health check endpoint.** For debugging and QA, a simple health check IPC channel (`system:health`) that reports DB status, provider connectivity, and active agents would be valuable.
- **Logging:** The plan has no logging strategy. Add a structured logger (pino) with log levels and log file rotation.
