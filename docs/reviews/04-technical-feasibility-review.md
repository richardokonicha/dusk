# 04 — Technical Feasibility Review

**Reviewer:** Technical Feasibility Agent  
**Date:** 2026-08-11  
**Scope:** Tech stack viability, implementation complexity, performance, risk areas

## Verdict: APPROVED with significant complexity warnings

### What works

- **Electron + Vite + React** is mature and well-understood. Dusk Studio itself uses this stack, which validates the choice.
- **better-sqlite3** for local persistence is the right call. It's synchronous, fast, and well-suited for desktop apps.
- **TailwindCSS v4 + shadcn/ui** reduces UI implementation time significantly. The component library plan is realistic.
- **pnpm monorepo** is appropriate for desktop + renderer + future mobile packages.

### Critical concerns

**1. Node.js 24.x is too new for production Electron apps.**

The master plan specifies `Node >= 24.x`. As of mid-2026, Node 24 is the latest LTS candidate, but Electron's main process runs on Node.js bundled with Electron — not the system Node. The Electron version bundled with Node 24 support may not be stable yet.

**Recommendation:** Use Node 22.x LTS for development. Electron 30+ bundles Node 22. This is proven, stable, and has broad CI support. Upgrade to Node 24 when Electron officially supports it.

**2. Streaming architecture has no reconnection or backpressure handling.**

The `streamChat` API returns `AsyncIterable<StreamChunk>`. If the renderer process crashes mid-stream or the network drops:
- There's no checkpoint/resume mechanism
- No message queue for retry
- No backpressure signaling (renderer can't tell main to slow down)

For a desktop app where the provider is always local/networked, this is a real risk. Users will lose partial responses on crash.

**Recommendation:** Implement a simple checkpoint system. After each tool call or N text chunks, persist the accumulated response to SQLite. On reconnection, resume from last checkpoint. This is Phase 1 infrastructure, not polish.

**3. Code execution tool is listed in architecture but not scoped.**

`backend-architecture.md` registers `CodeExecutionTool` as a built-in tool. But:
- No sandboxing strategy is defined
- No security model (what code, what permissions, what resources)
- The `agent-system.md` open questions mention Docker/VM but don't resolve it

**Recommendation:** Remove `CodeExecutionTool` from Phase 1 MVP. It's a Phase 2 feature that requires careful security design. Shipping it in MVP without sandboxing is a liability.

### Medium concerns

- **Electron security defaults:** `sandbox: false` in the BrowserWindow config is noted as required for better-sqlite3, but it weakens the renderer security model. Evaluate if `contextIsolation: true` + preload-only is sufficient, or if we need the `utilityProcess` pattern (Electron 30+) to run better-sqlite3 in a separate process.
- **Framer Motion bundle size:** The design system uses Framer Motion extensively. For a desktop app, this is fine (bundle size budget is 5MB gzipped for renderer). But on mobile (Phase 2), we'll need `moti` or `react-native-reanimated` instead. Plan for this divergence.
- **Vite + Electron dev server:** The dev setup (Vite dev server on port 5173 + Electron loading from it) works, but HMR for Electron main process is tricky. Plan for full reloads during main process development.

### Minor concerns

- **TypeScript strict mode:** The plan specifies strict mode. Ensure `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are enabled — they catch real bugs.
- **Vitest vs Jest:** The frontend plan mentions Vitest (correct), but some Dusk reference code uses Jest. Ensure no Jest config leaks into Dusk.
