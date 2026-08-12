# Dusk — Unified Roadmap

## Executive Summary

Dusk is being built as a **professional Work OS** — a calm, focused desktop environment for AI-assisted work. This roadmap synthesizes input from 11 specialist agents covering architecture, design, frontend, backend, agents, mobile, legal, marketing, documentation, testing, and DevOps.

**Current Status:** Phase 0 complete. All foundational docs written. Ready to begin Phase 1 implementation.

---

## What We Aim to Achieve

### Vision
Dusk is where AI work lives. Not a chat app, not a studio — a **persistent work environment** with:
- Workspaces (projects with files, history, agents)
- Professional agents that produce artifacts
- Any model provider, no lock-in
- Local-first data, optional Fugoku on-ramp

### 12-Month Goals
1. Ship standalone desktop product (mac/win/linux)
2. Build meaningful user base with independent revenue
3. Establish "calm work environment for AI" brand position
4. Fugoku ecosystem: Gateway integration + Cloud on-ramp

### Non-Goals
- Not a browser, IDE, or OS kernel
- Not a hosted SaaS at launch
- Not a model training platform

---

## What the World Expects

### From Professionals
- **Reliability:** Works out of the box, no environment setup
- **Privacy:** Local-first, no mandatory cloud
- **Flexibility:** Any provider, any model, no lock-in
- **Professional output:** Artifacts, files, structured work products
- **Transparency:** Clear pricing, no surprise bills
- **Support:** Responsive, professional, excellent documentation

### Market Landscape
- Cherry Studio (50k stars, AGPL, Chinese origin) — we match features but with clean IP and Western branding
- Open WebUI (open source, self-hosted) — less professional positioning
- Cursor/Claude Code (IDE-integrated) — not a work OS
- Poe (consumer-facing) — not professional-grade
- **Dusk's position:** Professional, calm, workspace-centric, local-first

### Regulatory
- AI labeling laws (EU AI Act)
- Data privacy (GDPR, CCPA) — local-first helps
- Open source compliance (AGPL, MIT, Apache)
- Commercial licensing (if using Cherry code — we don't)

---

## How We Achieve It

### Tech Stack (Greenfield)

**Desktop (Phase 1)**
- Electron + Vite + React + TypeScript
- pnpm monorepo
- better-sqlite3 for persistence
- TailwindCSS v4 + shadcn/ui + Framer Motion
- Node >= 24.x, pnpm >= 11.x

**Mobile (Phase 2+)**
- React Native + Expo + Drizzle ORM

**Key Design Decisions**
- ✅ Greenfield build (no AGPL contamination)
- ✅ Electron desktop-first (mirrors Cherry's proven architecture)
- ✅ Local-first data model
- ✅ Provider-agnostic (OpenAI-compatible + key providers)
- ✅ Agent system with tools and artifacts

---

## Team Expectations

### Specialist Agents (11)

| Agent | Primary Output | Status |
|-------|---------------|--------|
| Architect | `docs/architecture.md` | ✅ Complete |
| UI Designer | `docs/design-system.md` | ✅ Complete |
| Frontend Eng | `docs/frontend-plan.md` | ✅ Complete |
| Backend/Desktop Eng | `docs/backend-architecture.md` | ✅ Complete |
| Agent System Eng | `docs/agent-system.md` | ✅ Complete |
| Mobile Eng | `docs/mobile-strategy.md` | ✅ Complete |
| Legal/IP Counsel | `docs/legal-framework.md` | ✅ Complete |
| Marketing/Growth | `docs/goto-market.md` | ✅ Complete |
| Technical Writer | `docs/documentation-plan.md` | ✅ Complete |
| QA/Testing Eng | `docs/testing-strategy.md` | ✅ Complete |
| DevOps/Release Eng | `docs/devops-release.md` | ✅ Complete |

### Working Groups

**Group A: Core Platform** (Architect, Backend/Desktop Eng, Agent System Eng)
- Responsible for: Electron shell, IPC, services, database, agent runtime
- Key deliverable: Working desktop app with chat + workspace
- **Status:** Architecture complete, ready for implementation

**Group B: User Experience** (UI Designer, Frontend Eng, Mobile Eng)
- Responsible for: UI design, React components, mobile port
- Key deliverable: Polished, branded desktop UI + mobile prototype
- **Status:** Design system complete, component plan ready

**Group C: Go-to-Market** (Legal/IP Counsel, Marketing/Growth, Technical Writer)
- Responsible for: Legal compliance, branding, docs, launch
- Key deliverable: Launch-ready product with docs and legal clearance
- **Status:** Legal framework complete, GTM strategy ready

**Group D: Quality & Release** (QA/Testing Eng, DevOps/Release Eng)
- Responsible for: Testing, CI/CD, packaging, distribution
- Key deliverable: Automated build/test pipeline + release packages
- **Status:** Testing strategy complete, CI/CD pipeline designed

---

## Implementation Phases

### Phase 0 — Foundation ✅ COMPLETE

**Status:** All foundational docs complete. Decisions locked.

**Deliverables:**
- ✅ Vision, naming, brand lock
- ✅ Standalone vs Fugoku capability matrix
- ✅ Cherry diff (keep/customize/add)
- ✅ Tech stack decisions
- ✅ Reference repos cloned (design reference only)
- ✅ 11 specialist agent plans produced

**Key Decisions:**
- ✅ Greenfield build (no AGPL contamination)
- ✅ Electron + Vite + React + TypeScript
- ✅ Desktop-first, mobile later
- ✅ Dusk branding (no Chinese references)
- ✅ Professional positioning

---

### Phase 1 — Standalone Desktop MVP

**Goal:** A usable Dusk desktop client that works with any provider, no Fugoku.

**Duration:** 12-16 weeks (3-4 months)

**Key Deliverables:**
1. **Electron Shell**
   - Main/renderer process separation
   - IPC layer (type-safe)
   - Service container
   - Native integrations (tray, shortcuts)

2. **Workspace Model**
   - Workspace CRUD
   - Workspace switching
   - File browser
   - Artifact storage

3. **Provider System**
   - OpenAI, Anthropic, Gemini, Ollama adapters
   - Streaming support
   - Tool/function calling
   - Provider testing UI

4. **Chat Interface**
   - Message rendering (markdown, code)
   - Streaming responses
   - Conversation history
   - Search

5. **Workspace Agent**
   - Default persistent agent
   - Basic tool use (read_file, write_file, list_files)
   - Artifact output
   - Simple task spawning

6. **Dusk Branding**
   - Logo, icons, splash screen
   - Dusk theme (dark default)
   - Theme switching
   - Professional aesthetic

7. **Build & Package**
   - CI/CD pipeline
   - electron-builder config
   - GitHub Releases
   - Auto-update

**Sprint Plan:**

**Sprint 1-2: Project Scaffold**
- [ ] Initialize pnpm monorepo
- [ ] Set up Electron + Vite + React
- [ ] Configure TypeScript, TailwindCSS, shadcn/ui
- [ ] Set up CI/CD (lint, typecheck, test)
- [ ] Create basic AppShell

**Sprint 3-4: Core Services**
- [ ] Database layer (better-sqlite3, schema, migrations)
- [ ] Provider system (OpenAI adapter, streaming)
- [ ] IPC layer (type-safe channels)
- [ ] File system service
- [ ] Settings service

**Sprint 5-6: Workspace & Chat**
- [ ] Workspace CRUD UI
- [ ] Conversation list
- [ ] Chat interface (messages, input, streaming)
- [ ] Message rendering (markdown, code blocks)
- [ ] Provider setup flow

**Sprint 7-8: Agent System**
- [ ] Agent runtime (lifecycle, context, tools)
- [ ] Workspace Agent (default)
- [ ] Tool execution (read_file, write_file, list_files)
- [ ] Agent status indicators
- [ ] Simple task spawning

**Sprint 9-10: Polish & Branding**
- [ ] Dusk theme implementation
- [ ] Theme switching
- [ ] Onboarding flow
- [ ] Settings panels
- [ ] Keyboard shortcuts

**Sprint 11-12: Testing & Release**
- [ ] Unit tests (core services)
- [ ] Component tests (UI)
- [ ] E2E tests (critical flows)
- [ ] Accessibility audit
- [ ] Package for mac/win/linux
- [ ] GitHub Release v0.1.0

**Milestone:** Phase 1 complete when desktop app ships on all three platforms with working chat, workspaces, agents, and branding.

---

### Phase 2 — Fugoku On-Ramp

**Goal:** Add Fugoku Gateway integration and advanced agent features.

**Duration:** 8-12 weeks

**Key Deliverables:**
1. **Fugoku Gateway**
   - Provider preset
   - One-click connect
   - Routing UI
   - Usage dashboard

2. **Advanced Agents**
   - Task Agent (queue/scheduler)
   - Specialist Agent templates
   - Multi-agent orchestrator
   - Agent configuration UI

3. **Enhanced UX**
   - Command palette
   - Global search
   - Keyboard shortcuts
   - Productivity features

---

### Phase 3 — Fugoku Cloud & Beyond

**Goal:** Cloud sync, compute provisioning, mobile app.

**Duration:** 12-16 weeks

**Key Deliverables:**
1. **Fugoku Cloud Integration**
   - Workspace sync
   - GPU/compute provisioning
   - Team workspaces

2. **Mobile App**
   - React Native + Expo
   - Core chat/agent features
   - Sync with desktop

3. **Advanced Features**
   - Background System Agents
   - Webhook triggers
   - Plugin system
   - Knowledge base

---

## Risk Management

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| AGPL contamination | Low | Critical | Greenfield build, legal audit | Legal |
| Scope creep | High | High | Strict phase gates, MVP discipline | Architect |
| Resource constraints | High | High | Phased delivery, agent leverage | All |
| Brand confusion with Cherry | Medium | Medium | Distinct naming, positioning | Marketing |
| Provider API changes | Medium | Medium | Abstraction layer, adapters | Backend |
| Competitive saturation | High | Medium | Professional positioning | Marketing |

---

## Success Metrics

### Phase 1 (MVP Launch)
- [ ] Desktop app ships on mac/win/linux
- [ ] 1,000+ downloads in first 30 days
- [ ] 5+ provider integrations working
- [ ] 0 critical bugs in first week
- [ ] Documentation complete
- [ ] NPS ≥ 50 from beta users

### Phase 2 (Fugoku On-Ramp)
- [ ] Fugoku Gateway integration live
- [ ] 100+ active users on gateway
- [ ] Task Agent and Orchestrator working
- [ ] Community contributions begin

### Phase 3 (Scale)
- [ ] Mobile app in beta
- [ ] 10k+ users
- [ ] Paid tier available
- [ ] Enterprise pilot customers

---

## Immediate Next Actions

### Week 1: Project Setup
- [ ] **All teams:** Review master plan and specialist docs
- [ ] **Architect:** Initialize pnpm monorepo, Electron scaffold
- [ ] **Backend:** Set up better-sqlite3, database schema
- [ ] **Frontend:** Initialize React + Vite + TailwindCSS + shadcn/ui
- [ ] **UI Designer:** Finalize design system, create component library
- [ ] **Legal:** Complete AGPL audit, confirm greenfield approach

### Week 2-3: Core Infrastructure
- [ ] **Architect:** IPC layer, service container
- [ ] **Backend:** Provider system (OpenAI adapter), streaming
- [ ] **Frontend:** AppShell, routing, theme provider
- [ ] **Agent Eng:** Agent runtime scaffold, tool executor
- [ ] **DevOps:** CI/CD pipeline, GitHub Actions

### Week 4-6: Feature Development
- [ ] **Frontend:** Workspace UI, chat interface
- [ ] **Backend:** Workspace service, conversation service
- [ ] **Agent Eng:** Workspace Agent, basic tools
- [ ] **QA:** Test infrastructure, initial test suite

### Week 7-10: Polish & Integration
- [ ] **All teams:** Integration testing
- [ ] **UI Designer:** Final polish, animations
- [ ] **Marketing:** Prepare launch materials
- [ ] **Technical Writer:** Draft initial docs

### Week 11-12: Release
- [ ] **QA:** Full test suite, manual testing
- [ ] **DevOps:** Package builds, GitHub Release
- [ ] **Marketing:** Launch on Product Hunt, Hacker News
- [ ] **All teams:** Monitor, respond to feedback

---

## Document Index

All specialist plans are in `docs/`:

| Document | Author | Status |
|----------|--------|--------|
| `master-plan.md` | Architect | ✅ Complete |
| `vision.md` | Product | ✅ Complete |
| `architecture.md` | Architect | ✅ Complete |
| `design-system.md` | UI Designer | ✅ Complete |
| `frontend-plan.md` | Frontend Eng | ✅ Complete |
| `backend-architecture.md` | Backend Eng | ✅ Complete |
| `agent-system.md` | Agent System Eng | ✅ Complete |
| `mobile-strategy.md` | Mobile Eng | ✅ Complete |
| `legal-framework.md` | Legal | ✅ Complete |
| `goto-market.md` | Marketing | ✅ Complete |
| `documentation-plan.md` | Technical Writer | ✅ Complete |
| `testing-strategy.md` | QA Eng | ✅ Complete |
| `devops-release.md` | DevOps Eng | ✅ Complete |
| `agents.md` | Agent System Eng | ✅ Complete |
| `standalone-vs-fugoku.md` | Product | ✅ Complete |
| `cherry-diff.md` | Product | ✅ Complete |

---

## Conclusion

Dusk is ready to move from planning to implementation. All 11 specialist agents have produced comprehensive, implementable plans. The architecture is solid, the design system is defined, the legal foundation is clean, and the go-to-market strategy is clear.

**Next step:** Begin Phase 1 Sprint 1 — project scaffold.

*This roadmap is the single source of truth. All work should trace back to this document.*
