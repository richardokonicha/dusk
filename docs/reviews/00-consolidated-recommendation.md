# 00 — Consolidated Recommendation

**Document:** Dusk Work OS — Single Source of Truth  
**Date:** 2026-08-11  
**Author:** Consolidation Lead  
**Status:** FINAL — All 14 manager agents have reviewed  

---

## 1. Executive Summary of All Reviews

Fourteen manager agents reviewed the Dusk master plan, unified roadmap, and 11 specialist plans. **Thirteen of fourteen reviews approve the overall direction.** The project is greenfield, the stack is proven, and the positioning is differentiated. However, the reviews surface **critical gaps** that must be closed before implementation begins.

**Bottom line:** Dusk is architecturally sound but legally fragile, timeline-naive, and design-immature. The engineering team should not start Sprint 1 until the P0 items in this document are resolved.

**Review verdicts:**
| Review | Verdict | Critical Issues |
|--------|---------|-----------------|
| 01 Architecture | Approved with conditions | 3 |
| 02 Fugoku Ecosystem | Approved with concern | 1 |
| 03 Legal/IP | Conditionally approved | 3 |
| 04 Technical Feasibility | Approved with warnings | 3 |
| 05 UI/UX | Approved with refinement | 4 |
| 06 Agent System | Approved with gap | 1 |
| 07 Mobile Strategy | Deferred | 1 |
| 08 DevOps/Release | Approved with gaps | 2 |
| 09 Documentation/DX | Approved with concern | 1 |
| 10 Testing/QA | Approved with gap | 1 |
| 11 Frontend Plan | Approved with concerns | 2 |
| 12 Backend/Desktop | Approved with gaps | 2 |
| 13 GTM/Positioning | Approved with timing issue | 1 |
| 14 Risk Assessment | Significant gaps | 25+ |

---

## 2. Top 10 Critical Findings (Prioritized)

### P0 — Block Implementation

**1. AGPL boundary has no automated enforcement**  
The `reference/` Cherry directory must never ship with Dusk. The legal framework states this, but there is no CI check, no build-time exclusion, and no automated license scan. One mistaken build invalidates the entire legal strategy.  
*Action:* Add CI step that fails on AGPL/GPL/LGPL/SSPL/BUSL dependencies. Add build-time verification that `reference/` is excluded from artifacts. Add `license-checker` to every PR.

**2. Electron security architecture is undefined**  
Cherry Studio has published 3 CVEs in 12 months from Electron misconfigurations. Dusk uses the same attack surface. `sandbox: false`, no preload audit, no URL validation rules, and no MCP trust model are documented.  
*Action:* Create Electron security checklist. Enforce `contextIsolation: true`, `nodeIntegration: false`, preload bridge whitelist, and validated IPC for all external operations. Make this a Phase 1 quality gate.

**3. Phase 1 timeline is unrealistic**  
12–16 weeks for a production Electron app with agent runtime, workspace model, provider abstraction, theme engine, and build pipeline is historically optimistic by 40–60%. The 11-agent operating model adds coordination overhead not accounted for.  
*Action:* Revise to 20–24 week realistic estimate. Define minimum shippable MVP (12 weeks) vs. complete MVP (24 weeks). Add 20% contingency buffer.

**4. Privacy policy and ToS missing before public beta**  
GTM targets Product Hunt in Week 7. Legal flags privacy policy, terms of service, and CLA workflow as incomplete. You cannot legally ship to users without these.  
*Action:* Draft and publish privacy policy and ToS before beta recruitment. Push public launch to Week 9-10.

**5. Design system is 50% complete**  
The token system lacks semantic roles, state tokens, elevation/z-index scale, empty/skeleton states, and focus management tokens. The chat UI is monolithic and cannot support thinking traces, tool execution blocks, or citations. Accessibility is stated but not designed.  
*Action:* Redesign token system around semantic roles (background, foreground, primary, destructive, border, ring, etc.) before writing component code. Add EmptyState, Skeleton, and ErrorBoundary to the core component list.

**6. Streaming has no checkpoint/reconnection**  
If the renderer crashes mid-stream, the response is lost. No backpressure, no resume, no persistence of partial responses.  
*Action:* Implement checkpoint system — persist accumulated response to SQLite after each tool call or N text chunks. Resume from last checkpoint on reconnection.

**7. Agent Runtime async API is broken**  
`invoke()` is defined as `AsyncIterable<AgentEvent>` but JobQueueService calls it as if it returns a Promise. This is a design bug.  
*Action:* Split into `invokeStream()` (async iterable for UI) and `invoke()` (Promise for job queue).

**8. CodeExecutionTool is Phase 1 but has no sandbox**  
No security model, no resource limits, no isolation strategy. Shipping this in MVP is a liability.  
*Action:* Remove from Phase 1. Defer to Phase 2 with proper sandbox design.

**9. Drizzle vs raw better-sqlite3 is inconsistent**  
Architecture doc shows raw SQLite. Backend doc imports Drizzle. Mobile plan uses Drizzle. This creates schema drift.  
*Action:* Standardize on Drizzle ORM across desktop and mobile. Desktop uses `drizzle-orm/better-sqlite3`, mobile uses `drizzle-orm/expo-sqlite`. Same schema, same migrations.

**10. SecureStorageService encrypts the key, not the value**  
The `get()` method encrypts the key name, `set()` encrypts the value — they're backwards. API keys stored today are in plaintext.  
*Fix:* Invert the logic. `set()` encrypts the value, `get()` decrypts the stored value.

### P1 — Complete in Sprint 1-2

- **Fugoku Gateway needs a ProviderRouter interface** in Phase 1 so Phase 2 can plug it in without refactoring
- **Database migration versioning** — use Drizzle Kit, not a single SQL file
- **JobQueueService has circular dependency** — inject `agentRuntime`
- **Playwright E2E for Electron is unconfigured** — add `playwright-electron` fixture
- **Onboarding flow is Sprint 4 but should be Sprint 1** — first-run experience is product, not docs
- **Cherry comparison page needed before launch** — highest-intent SEO and conversion content
- **No preview build in CI** — QA needs installable packages before release tags
- **No mobile data export/import** — Phase 2 mobile needs manual workspace transfer to avoid data fragmentation
- **Context window exhaustion** — document truncation policy and checkpoint/resume
- **MCP trust model** — user approval, permission granularity, audit logging

---

## 3. Conflicts and Resolutions

| Conflict | Reviewer A | Reviewer B | Resolution |
|----------|-----------|-----------|------------|
| **Database layer** | Architecture 01: Standardize on Drizzle | Backend 12: Shows Drizzle but architecture.md shows raw SQLite | **Use Drizzle ORM across both desktop and mobile.** Same schema source of truth. |
| **Node.js version** | Master plan: Node 24.x | Technical Feasibility 04: Node 22.x LTS | **Use Node 22.x LTS.** Electron 30+ bundles Node 22. Upgrade when Electron supports 24. |
| **Phase 1 timeline** | Master plan: 12-16 weeks | Risk Assessment 14: 20-24 weeks | **Adopt 20-24 week realistic estimate.** Define 12-week aggressive minimum and 24-week complete MVP. |
| **Launch timing** | GTM 13: Week 7 Product Hunt | Legal 03: Privacy policy incomplete | **Push to Week 9-10.** Legal prerequisites first, then internal alpha, then public beta. |
| **Mobile sync** | Mobile 07: Phase 2 is standalone | Risk 14: Data fragmentation undermines value prop | **Add manual export/import in Phase 2.** Validates serialization format for Phase 3 sync. |
| **Agent Orchestrator** | Agent System 06: Keyword routing is placeholder | Risk 14: Misrouting creates user confusion | **Default to Workspace Agent in Phase 1.** Specialist routing is Phase 2 with LLM classification. |
| **Code execution** | Architecture includes CodeExecutionTool | Technical Feasibility 04: Remove from Phase 1 | **Remove from Phase 1.** Defer to Phase 2 with sandbox design. |
| **Electron sandbox** | Backend 12: sandbox:false for better-sqlite3 | Risk 14: Security regression | **Accept sandbox:false for Phase 1.** Evaluate utilityProcess for Phase 2. Document risk. |
| **Onboarding timing** | Documentation 09: Sprint 4 | UI/UX 05: First impression is conversion-critical | **Move to Sprint 1.** First-run experience is product, not documentation. |
| **Design system maturity** | Most reviews: Approved | UI/UX 05: Tokens are 50% complete, needs semantic layer | **Redesign token system before implementation.** Semantic roles, state tokens, elevation scale, empty states. |
| **Fugoku Gateway timing** | Ecosystem 02: Phase 2 | Risk 14: Gateway doesn't exist yet | **Add ProviderRouter interface in Phase 1.** Define Phase 2 fallback without Gateway. |
| **Zustand vs MMKV on mobile** | Mobile 07: MMKV for settings | Risk/Architecture: Desktop uses SQLite | **Use SQLite (expo-sqlite) as single source of truth on mobile.** Zustand as in-memory cache. |

---

## 4. Revised Unified Roadmap

### Phase 0 — Foundation (COMPLETE)
All foundational docs written. Decisions locked.

### Phase 1 — Standalone Desktop MVP (20-24 weeks, aggressive: 12 weeks)

**Sprint 1: Project Scaffold + Security Lock (Weeks 1-2)**
- [ ] Initialize pnpm monorepo with packages/desktop, packages/renderer, packages/shared
- [ ] Set up Electron 30+ with security architecture (contextIsolation, preload whitelist)
- [ ] Configure Vite + React + TypeScript + TailwindCSS v4 + shadcn/ui
- [ ] **Redesign token system** — semantic roles, state tokens, elevation scale
- [ ] Set up CI: lint, typecheck, test, license-checker, AGPL boundary check
- [ ] Add Drizzle ORM, define shared schema, set up migration system
- [ ] Create Electron security checklist, make it a quality gate
- [ ] **Onboarding flow design** — first-run experience spec

**Sprint 2: Core Services (Weeks 3-4)**
- [ ] Database layer — Drizzle + better-sqlite3, repositories, migrations
- [ ] Provider system — OpenAI, Anthropic, Gemini, Ollama, Custom adapters
- [ ] ProviderRouter interface (no-op in Phase 1, enables Fugoku Gateway in Phase 2)
- [ ] IPC layer — type-safe channels, request/response, event streaming
- [ ] File system service — read/write/list, chokidar with `.duskignore`
- [ ] SecureStorageService — fix encryption logic, platform key store
- [ ] JobQueueService — fix circular dependency, inject agentRuntime

**Sprint 3: Workspace & Chat (Weeks 5-7)**
- [ ] Workspace CRUD UI, workspace switcher
- [ ] Conversation list + chat interface
- [ ] Message rendering — composable blocks (text, tool, error), not monolithic bubble
- [ ] Streaming with checkpoint/resume
- [ ] Provider setup flow
- [ ] IPC client in shared package (not duplicated)

**Sprint 4: Agent System (Weeks 8-10)**
- [ ] Agent runtime — split `invoke()` (Promise) and `invokeStream()` (AsyncIterable)
- [ ] Workspace Agent (default, persistent)
- [ ] Tool execution — read_file, write_file, list_files
- [ ] **Remove CodeExecutionTool** — defer to Phase 2
- [ ] **Default Orchestrator to Workspace Agent** — no keyword routing in Phase 1
- [ ] Artifact output — save agent responses as workspace files
- [ ] Agent config in JSON (not YAML)
- [ ] MCP trust model — user approval, permission granularity, audit logging

**Sprint 5: Polish & Branding (Weeks 11-13)**
- [ ] Dusk theme implementation — dark default, light theme, system detection
- [ ] Theme switching, custom theme support
- [ ] Settings panels — providers, agents, theme, general
- [ ] Keyboard shortcuts
- [ ] Empty states, skeletons, error boundaries
- [ ] Focus management — inset-only, no positive outline offsets

**Sprint 6: Testing & Release (Weeks 14-16)**
- [ ] Unit tests (core services, provider adapters, agent runtime)
- [ ] Component tests (chat, workspace, agent UI)
- [ ] Integration tests (IPC, database, provider round-trips)
- [ ] E2E tests — configure `playwright-electron` fixture
- [ ] Accessibility audit — contrast ratios, ARIA live regions, keyboard nav
- [ ] Performance benchmarks — cold start ≤3s, IPC ≤50ms, bundle ≤5MB
- [ ] Code signing setup — certificates, notarization process
- [ ] Package for mac/win/linux

**Sprint 7: Alpha & Beta (Weeks 17-20)**
- [ ] Internal alpha (5-10 trusted users)
- [ ] Bug fixes, performance tuning
- [ ] Privacy policy, ToS, CLA, Security.md published
- [ ] Comparison page (Dusk vs Cherry) written
- [ ] Public beta (50-100 users)
- [ ] GitHub Release v0.1.0

**Milestone:** Phase 1 complete when desktop app ships on all three platforms with working chat, workspaces, agents, branding, and legal clearance. **Target: Week 20 (aggressive: Week 16).**

### Phase 2 — Fugoku On-Ramp (Weeks 21-32)

**Prerequisites:** Phase 1 shipped + Fugoku Gateway capability confirmed.

- [ ] Fugoku Gateway provider preset (uses ProviderRouter interface)
- [ ] Account-connect flow
- [ ] Task Agent with queue/scheduler
- [ ] Specialist Agent templates
- [ ] Multi-agent orchestrator (LLM-based routing, not keyword)
- [ ] Routing usage surfaced in UI
- [ ] Mobile app (React Native + Expo) — read-only, manual export/import
- [ ] CodeExecutionTool with sandboxing

### Phase 3 — Fugoku Cloud & Beyond (Weeks 33-48)

- [ ] Cloud sync of workspace
- [ ] GPU/compute provisioning from Dusk
- [ ] Team/shared workspaces
- [ ] Background System Agents
- [ ] Mobile full sync, push notifications, file upload
- [ ] Plugin/extension marketplace

---

## 5. Immediate Action Items (Next 2 Weeks)

These items must be completed before Sprint 1 implementation begins.

### Week 1 (Days 1-5)

| # | Action | Owner | Deliverable |
|---|--------|-------|-------------|
| 1 | Lock Electron version (30+) and Node version (22.x LTS) | Backend Eng | Version pin in package.json + rationale doc |
| 2 | Create Electron security checklist | Backend Eng | `docs/electron-security.md` with all controls |
| 3 | Redesign token system around semantic roles | UI Designer | Updated `design-system.md` v2 with semantic tokens |
| 4 | Define Phase 1 MVP scope (12-week vs 24-week) | Architect + Marketing | `docs/phase1-mvp-definition.md` |
| 5 | Set up `license-checker` in CI, configure AGPL block | DevOps + Legal | CI config + `.github/dependabot.yml` |
| 6 | Draft privacy policy and terms of service | Legal | `dusk.ai/privacy` and `dusk.ai/terms` drafts |
| 7 | Start code signing certificate process | DevOps | Apple Developer account + Windows EV cert research |

### Week 2 (Days 6-10)

| # | Action | Owner | Deliverable |
|---|--------|-------|-------------|
| 8 | Initialize monorepo scaffold (packages/desktop, renderer, shared) | Architect | Working repo with CI |
| 9 | Set up Drizzle ORM with shared schema | Backend Eng | `packages/shared/schema/` with migrations |
| 10 | Configure Playwright Electron fixture | QA Eng | Working E2E test that launches Electron |
| 11 | Write Cherry Studio comparison page | Marketing | `docs/compare/cherry-studio.md` |
| 12 | Design onboarding flow spec | UI Designer + Tech Writer | `docs/in-app-help/onboarding.md` v2 |
| 13 | Fix SecureStorageService encryption logic | Backend Eng | Corrected implementation in `backend-architecture.md` |
| 14 | Draft Fugoku Gateway fallback plan | Architect + Marketing | Phase 2 features without Gateway |

---

## 6. What the Engineering Team Should Build FIRST

**Week 1-2 priority: Foundation infrastructure, not features.**

The engineering team should not start building the chat interface, workspace UI, or agent features until the following are in place:

1. **Security-hardened Electron shell** — contextIsolation, preload whitelist, IPC channel registry with Zod validation. Without this, every subsequent feature is built on an insecure foundation.

2. **Drizzle ORM with shared schema** — This is the data backbone. Workspaces, conversations, messages, agents, files, jobs, providers, and settings all depend on it. Get the schema right, lock migrations, and both desktop and mobile can build on top.

3. **Provider system with ProviderRouter interface** — The abstraction layer that makes Dusk provider-agnostic. Without this, chat cannot work. With the Router interface, Fugoku Gateway slots in during Phase 2 without refactoring.

4. **Type-safe IPC layer** — The contract between main and renderer. Every UI feature calls through IPC. Define channels, schemas, and the IPCClient wrapper before building any renderer code.

5. **Design system v2 with semantic tokens** — Every component will use these tokens. If the token system is wrong, every component must be rewritten. Fix this first.

**Do NOT build first:**
- Chat UI (needs IPC + provider system)
- Agent runtime (needs provider + IPC + DB)
- Theme switcher (needs semantic tokens)
- File browser (needs workspace + DB)
- Onboarding flow (needs all of the above)

**The correct build order is:**
1. Security architecture + Electron shell
2. Drizzle schema + database layer
3. Provider system + ProviderRouter
4. IPC layer + IPCClient
5. Semantic token system + design system
6. THEN: workspace, chat, agents, files, settings

---

*This document supersedes all previous plans. Every implementation task must trace back to this recommendation. Update this document when decisions change.*
