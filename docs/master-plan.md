# Dusk — Master Plan

## Mission

Build **Dusk Work OS** — a standalone, professional AI work environment that becomes the primary place professionals do AI-assisted work. Desktop-first, mobile later, with an optional Fugoku ecosystem on-ramp.

---

## 1. What We Aim to Achieve

### 1.1 Product Vision
- A **Work OS**, not a chat client — persistent workspaces, files as first-class objects, agents that produce deliverables
- Professional positioning: "the calm work environment for AI" — distinct from noisy "AI studio" tools
- Standalone-first: works with any OpenAI-compatible provider, no account required
- Fugoku on-ramp: optional routing through Fugoku Gateway for unified billing, fallback, cost control

### 1.2 Success Criteria (12 months)
- Dusk ships as standalone desktop product (macOS, Windows, Linux)
- Meaningful user base with independent revenue
- Recognized as "the calm work environment for AI"
- Fugoku ecosystem coherent: Fugoku (sunrise/infrastructure) + Dusk (focus/work)

### 1.3 Non-Goals
- Not a browser, IDE, or OS kernel
- Not a hosted SaaS web app at launch
- Not a model training platform

---

## 2. How We Achieve It

### 2.1 Tech Stack

**Desktop (Phase 1)**
- Electron + Vite + React + TypeScript
- pnpm monorepo
- better-sqlite3 for local persistence
- TailwindCSS v4 + shadcn/ui + Framer Motion
- Node >= 24.x, pnpm >= 11.x

**Mobile (Phase 2+)**
- React Native + Expo + Drizzle ORM
- @ai-sdk/* for multi-provider support

**Build & Package**
- electron-builder for desktop (mac/win/linux)
- EAS for mobile builds

### 2.2 Architecture

```
┌─────────────────────────────────────┐
│           Dusk Desktop              │
│  ┌───────────────────────────────┐  │
│  │     Electron Main Process     │  │
│  │  - IPC Server                 │  │
│  │  - Service Container (IoC)    │  │
│  │  - Provider System            │  │
│  │  - Agent Runtime              │  │
│  │  - Job Queue                  │  │
│  │  - Local DB (better-sqlite3)  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │     Electron Renderer         │  │
│  │  - React 18 + TypeScript      │  │
│  │  - TailwindCSS v4             │  │
│  │  - shadcn/ui                  │  │
│  │  - Framer Motion              │  │
│  │  - Workspace UI               │  │
│  │  - Agent Chat Interface       │  │
│  │  - File Manager               │  │
│  │  - Settings / Providers       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           │                    │
           │                    │
     ┌─────▼─────┐      ┌──────▼──────┐
     │  OpenAI   │      │  Fugoku     │
     │  Anthropic│      │  Gateway    │
     │  Gemini   │      │  (Phase 2)  │
     │  Ollama   │      │             │
     │  Custom   │      │             │
     └───────────┘      └─────────────┘
```

### 2.3 Feature Phases

**Phase 0 — Foundation (COMPLETE)**
- [x] Vision, naming, brand lock
- [x] Standalone vs Fugoku capability matrix
- [x] Cherry diff (keep/customize/add)
- [x] Tech stack decisions
- [x] Reference repos cloned
- [x] Folder scaffold

**Phase 1 — Standalone Desktop MVP**
- [ ] Electron shell + Vite + React scaffold
- [ ] Workspace model (projects → chats/files/agents)
- [ ] Provider config (OpenAI-compatible + key providers)
- [ ] Chat interface with markdown, code highlighting, artifacts
- [ ] Workspace Agent (default, persistent, context-aware)
- [ ] Basic tool use (MCP, file read/write)
- [ ] Local file workspace
- [ ] Dusk branding (logo, palette: dusk/twilight tones)
- [ ] Theme system (Dusk default + customizable)
- [ ] Build + package (mac/win/linux)

**Phase 2 — Fugoku On-Ramp**
- [ ] Fugoku Gateway provider preset
- [ ] Account-connect flow
- [ ] Task Agent with queue/scheduler
- [ ] Specialist Agent templates
- [ ] Multi-agent orchestrator
- [ ] Routing usage surfaced in UI

**Phase 3 — Fugoku Cloud & Beyond**
- [ ] Cloud sync of workspace
- [ ] GPU/compute provisioning from Dusk
- [ ] Team/shared workspaces
- [ ] Background System Agents
- [ ] Mobile app (React Native + Expo)

---

## 3. Team Structure & Responsibilities

### 3.1 Specialist Agents (11)

| # | Agent | Domain | Primary Output |
|---|-------|--------|----------------|
| 1 | **Architect** | System design, data models, APIs | Architecture doc, type definitions |
| 2 | **UI Designer** | Visual design, branding, themes | Design system, component specs |
| 3 | **Frontend Eng** | React/Electron implementation | Feature implementations |
| 4 | **Backend/Desktop Eng** | Electron main process, DB, IPC | Service implementations |
| 5 | **Agent System Eng** | Agent runtime, tools, orchestration | Agent framework code |
| 6 | **Mobile Eng** | React Native + Expo | Mobile app scaffold |
| 7 | **Legal/IP Counsel** | Licensing, AGPL compliance, commercial terms | Legal guidance, license audit |
| 8 | **Marketing/Growth** | Positioning, messaging, launch strategy | Go-to-market plan, messaging |
| 9 | **Technical Writer** | Docs, guides, API references | Documentation set |
| 10 | **QA/Testing Eng** | Test strategy, automation, CI | Test suite, CI pipeline |
| 11 | **DevOps/Release Eng** | CI/CD, packaging, distribution | Build pipelines, release process |

### 3.2 Working Groups

**Group A: Core Platform** (Agents 1, 4, 5)
- Responsible for: Electron shell, IPC, services, database, agent runtime
- Key deliverable: Working desktop app with chat + workspace

**Group B: User Experience** (Agents 2, 3, 6)
- Responsible for: UI design, React components, mobile port
- Key deliverable: Polished, branded desktop UI + mobile prototype

**Group C: Go-to-Market** (Agents 7, 8, 9)
- Responsible for: Legal compliance, branding, docs, launch
- Key deliverable: Launch-ready product with docs and legal clearance

**Group D: Quality & Release** (Agents 10, 11)
- Responsible for: Testing, CI/CD, packaging, distribution
- Key deliverable: Automated build/test pipeline + release packages

---

## 4. What to Expect from Our Teammates

### 4.1 Core Expectations

**Architect**
- Produces clear, implementable system designs
- Documents data models, API contracts, service boundaries
- Reviews code for architectural compliance
- Anticipates scaling issues before they block us

**UI Designer**
- Delivers component specs, not just mockups
- Builds the Dusk design system (colors, typography, spacing, motion)
- Creates the theme engine architecture
- Defines interaction patterns for workspace, agents, files

**Frontend Eng**
- Implements React components following the design system
- Builds the chat interface, workspace navigation, settings
- Integrates with Electron IPC
- Writes component tests

**Backend/Desktop Eng**
- Builds Electron main process, IPC handlers
- Implements database layer (better-sqlite3)
- Builds provider system, agent service container
- Handles packaging and native integrations

**Agent System Eng**
- Designs agent runtime (lifecycle, memory, tools)
- Implements Workspace Agent, Task Agent, Specialist Agents
- Builds MCP integration layer
- Defines agent configuration schema

**Mobile Eng**
- Sets up React Native + Expo project
- Ports core UI components to mobile
- Implements mobile-specific provider adapters
- Prepares for EAS builds

**Legal/IP Counsel**
- Audits Cherry reference code for AGPL contamination risk
- Advises on commercial licensing strategy
- Drafts Dusk license, privacy policy, terms of service
- Identifies third-party license obligations

**Marketing/Growth**
- Defines Dusk positioning and messaging
- Creates launch plan (phased, professional audience)
- Prepares marketing site, social presence
- Plans community building strategy

**Technical Writer**
- Writes setup guide, architecture docs, API references
- Creates user-facing documentation
- Maintains changelog and release notes
- Builds docs site structure

**QA/Testing Eng**
- Defines test strategy (unit, integration, E2E)
- Sets up test infrastructure (Vitest, Playwright)
- Writes test suites for critical paths
- Defines quality gates for releases

**DevOps/Release Eng**
- Builds CI/CD pipeline (GitHub Actions)
- Configures electron-builder for multi-platform
- Sets up auto-update infrastructure
- Manages release process and distribution

### 4.2 Communication Protocol

- **Async-first**: Agents post outputs to designated files in `docs/` and `reference/`
- **Structured outputs**: Every agent produces actionable artifacts, not discussion
- **Review cycles**: Architect reviews system changes; Legal reviews branding/compliance
- **Handoff gates**: Phase 1 complete only when Core Platform + UX + QA + DevOps agree

---

## 5. What to Expect from the World

### 5.1 Market Landscape

**Competitors**
- Cherry Studio (50k stars, AGPL, Chinese origin)
- Open WebUI (open source, self-hosted)
- LangChain/LangSmith (developer-focused, SaaS)
- Cursor/Claude Code (IDE-integrated, not work OS)
- Poe (consumer-facing, multi-model)
- Various local-first clients (Ollama web UI, etc.)

**Dusk's Position**
- Professional work environment (not consumer chat)
- Desktop-native (not web-first SaaS)
- Standalone + optional Fugoku on-ramp
- Clean IP, Western branding, no Chinese associations
- Calm, focused aesthetic (not "AI studio" noise)

### 5.2 User Expectations

**Professional Users Expect**
- Reliability: works out of the box, no environment setup
- Privacy: local-first, no mandatory cloud
- Flexibility: any provider, any model, no lock-in
- Professional output: artifacts, files, structured work products
- Transparency: clear pricing, no surprise bills
- Support: responsive, professional, documentation

### 5.3 Regulatory Landscape

- **AI labeling laws**: EU AI Act, emerging requirements
- **Data privacy**: GDPR, CCPA — local-first helps
- **Export controls**: model access restrictions by region
- **Open source compliance**: AGPL, MIT, Apache license obligations
- **Commercial licensing**: if using Cherry code, need commercial license

### 5.4 Distribution Realities

- Desktop: direct download, GitHub releases, package managers (brew, apt, winget)
- Mac App Store / Microsoft Store: requires compliance, takes time
- Enterprise: direct sales, private deployment, support contracts
- Community: GitHub, Discord/Telegram, developer evangelism

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AGPL contamination | Medium | Critical | Greenfield build, legal audit, no Cherry code |
| Scope creep | High | High | Strict phase gates, MVP discipline |
| Resource constraints | High | High | Phased delivery, agent leverage |
| Brand confusion with Cherry | Medium | Medium | Distinct naming, branding, positioning |
| Fugoku dependency fears | Low | Medium | Standalone-first messaging |
| Mobile delays | Medium | Low | Desktop-first, mobile later |
| Provider API changes | Medium | Medium | Abstraction layer, provider adapters |
| Competitive saturation | High | Medium | Professional positioning, calm UX |

---

## 7. Success Metrics

**Phase 1 (MVP Launch)**
- Desktop app ships on mac/win/linux
- 1000+ downloads in first 30 days
- 5+ provider integrations working
- 0 critical bugs in first week
- Documentation complete

**Phase 2 (Fugoku On-Ramp)**
- Fugoku Gateway integration live
- 100+ active users on gateway
- Task Agent and Orchestrator working
- Community contributions begin

**Phase 3 (Scale)**
- Mobile app in beta
- 10k+ users
- Paid tier available
- Enterprise pilot customers

---

## 8. Immediate Next Actions

1. **Architect**: Scaffold Electron + Vite + React project, define folder structure
2. **UI Designer**: Lock Dusk design system (colors, typography, motion), create component library plan
3. **Backend Eng**: Set up better-sqlite3 schema, provider abstraction interface
4. **Legal**: Complete AGPL audit, confirm greenfield approach is clean
5. **Marketing**: Finalize positioning, prepare launch messaging

---

*This master plan is the north star. All agent work feeds back into it. Update as we learn.*
