# Dusk — Documentation Plan

## 1. Documentation Strategy

### 1.1 Doc Types and Purposes

| Doc Type | Purpose | Audience |
|---|---|---|
| **Getting Started Guide** | First-run orientation, basic concepts | New users |
| **Installation Guide** | Platform-specific setup steps | New users, IT admins |
| **Quick Start Tutorial** | Hands-on first experience (30 min) | New users |
| **User Guides** | Feature-by-feature walkthroughs | All users |
| **API Reference** | IPC, plugin system, automation endpoints | Developers, power users |
| **Architecture Docs** | System design, data flow, component relationships | Developers, contributors |
| **Onboarding Flow** | In-app first-run experience | New users |
| **Contextual Help** | Inline explanations, tooltips, empty states | All users |
| **Troubleshooting Guide** | Common issues, diagnostics, recovery | All users |
| **Contributing Guide** | Dev setup, code standards, PR process | Contributors |
| **Release Notes** | Version history, breaking changes, migration | All users |
| **Changelog** | Granular commit-level changes | Developers, power users |

### 1.2 Audience Segmentation

**New Users (0–7 days)**
- Goals: install, connect first provider, send first message, understand workspace concept
- Docs priority: Getting Started → Installation → Quick Start → Workspaces Guide
- Tone: welcoming, step-by-step, assumes no prior AI tool experience

**Power Users (7 days+)**
- Goals: customize workflows, use agents effectively, integrate providers, automate with plugins
- Docs priority: Agents Guide → Providers & Models → Keyboard Shortcuts → API Reference
- Tone: precise, efficient, assumes familiarity with core concepts

**Developers / Contributors**
- Goals: extend Dusk, build plugins, understand internals, contribute code
- Docs priority: Architecture Overview → Contributing Guide → API Reference → Building from Source
- Tone: technical, assumes programming proficiency, references source code

**Enterprises / IT Admins**
- Goals: deploy at scale, configure policies, manage providers, ensure compliance
- Docs priority: Installation Guide (enterprise sections) → Architecture Overview → Troubleshooting
- Tone: formal, emphasizes reliability, security, and manageability

### 1.3 Tone and Style Guide

**Voice**
- Calm, precise, professional — never hype-driven or casual
- Use active voice and imperative mood for instructions
- Write for an intelligent audience that values clarity over entertainment
- Avoid marketing language in user-facing docs ("amazing," "revolutionary," "game-changing")
- Use "Dusk" as a proper noun; refer to the product as "Dusk Work OS" in formal contexts, "Dusk" in narrative text

**Terminology Standards**
| Term | Usage |
|---|---|
| Workspace | Persistent project container holding chats, files, agents, and artifacts |
| Agent | A worker with tools, memory, and artifact output — not a chatbot persona |
| Artifact | A file or structured output produced by an agent or user |
| Provider | An LLM API backend (OpenAI, Anthropic, Ollama, Fugoku Gateway, etc.) |
| Model | A specific LLM offered by a provider (gpt-4o, claude-sonnet-4, etc.) |
| Fugoku Gateway | Optional routing layer for unified billing, fallback, and cost control |
| MCP | Model Context Protocol — external tool integration standard |
| Cherry Studio | Predecessor/reference implementation — mention only in architecture/contributing context |

**Formatting Conventions**
- Use title case for headings (Getting Started, not Getting started)
- Use sentence case for UI elements and file paths
- Prefer lists over paragraphs for procedures
- Use tables for comparisons, option matrices, and configuration references
- Use callouts for warnings, tips, and notes (see section 7)
- Keep paragraphs under 4 sentences; prefer shorter sentences

### 1.4 Maintenance and Update Strategy

**Update Triggers**
- Every release: update Release Notes and Changelog
- New feature: add/update corresponding user guide section within the same PR as feature code
- Breaking change: update migration guide and flag in release notes
- Provider change: update Providers & Models Guide and API Reference

**Review Cycle**
- Quarterly review of all docs for accuracy and relevance
- Docs reviewed by Technical Writer agent alongside each major feature PR
- Community contributions to docs reviewed within 5 business days

**Ownership**
- Technical Writer agent owns documentation structure and style enforcement
- Each contributing agent reviews docs for their domain (e.g., Agent System Eng reviews Agents Guide)
- Marketing/Growth agent reviews positioning and messaging alignment

---

## 2. Document Structure

### 2.1 Doc Site Outline

```
docs/
├── index.md                     # Doc site landing page
├── getting-started/
│   ├── installation.md          # Platform-specific install
│   ├── quick-start.md           # 30-minute hands-on tutorial
│   └── first-workspace.md       # Creating and configuring first workspace
├── guides/
│   ├── workspaces.md            # Workspace model, organization, management
│   ├── agents.md                # Agent types, configuration, lifecycle
│   ├── providers-and-models.md  # Provider setup, model selection, API keys
│   ├── files-and-artifacts.md   # File management, artifact chains, exports
│   ├── theme-customization.md   # Theme engine, palette, motion, branding
│   └── keyboard-shortcuts.md    # Complete shortcut reference
├── reference/
│   ├── keyboard-shortcuts.md    # Shortcut tables by platform
│   ├── troubleshooting.md       # Common issues, diagnostics, logs
│   ├── changelog.md             # Granular version history
│   └── release-notes.md         # Release summaries, migration guides
├── developer/
│   ├── architecture.md          # System design, data flow, components
│   ├── contributing.md          # Dev setup, standards, PR workflow
│   ├── api-reference/
│   │   ├── ipc.md               # Electron IPC contracts
│   │   ├── plugin-system.md     # Plugin API, lifecycle, hooks
│   │   └── automation.md        # CLI, scripting, automation endpoints
│   └── building-from-source.md  # Build prerequisites, steps, troubleshooting
├── in-app-help/
│   ├── onboarding.md            # First-run flow spec
│   ├── contextual-help.md       # Tooltip system, empty states design
│   └── tooltips.md              # Tooltip content inventory
├── enterprise/
│   ├── deployment.md            # Enterprise deployment guides
│   ├── security.md              # Security model, data flow, compliance
│   └── administration.md        # Admin console, policies, teams
└── appendices/
    ├── glossary.md              # Terminology definitions
    ├── faq.md                   # Frequently asked questions
    └── comparison.md            # Dusk vs competitors (Cherry, Open WebUI, etc.)
```

### 2.2 File Organization in Repo

```
dusk/
├── docs/
│   ├── AGENTS.md                # Agent architecture (existing)
│   ├── documentation-plan.md    # This file
│   ├── vision.md                # Product vision (existing)
│   ├── standalone-vs-fugoku.md  # Capability matrix (existing)
│   ├── cherry-diff.md           # Cherry comparison (existing)
│   ├── master-plan.md           # Master plan (existing)
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   ├── developer/
│   ├── in-app-help/
│   ├── enterprise/
│   └── appendices/
├── apps/
│   ├── desktop/                 # Electron + Vite + React
│   │   ├── src/
│   │   │   ├── main/            # Electron main process
│   │   │   └── renderer/        # React UI
│   │   └── ...
│   └── mobile/                  # React Native + Expo (Phase 3)
├── packages/
│   ├── shared/                  # Shared types, utils, schemas
│   ├── provider-system/         # Provider abstraction layer
│   ├── agent-runtime/           # Agent lifecycle, tools, memory
│   └── ipc/                     # IPC contracts and types
└── ...
```

**Principle:** Docs live alongside code in the same repo. User-facing docs in `docs/`, in-app help content in `apps/desktop/src/renderer/src/content/help/`.

### 2.3 Cross-Linking Strategy

**Within docs site**
- Every guide links to at least one related reference doc
- Getting Started links to Installation and Quick Start
- User guides link to relevant Troubleshooting sections
- Developer docs link to Architecture and Contributing Guide

**From code to docs**
- In-app help panels contain links to full documentation pages
- Error messages contain links to relevant Troubleshooting entries
- CLI `--help` output references documentation URLs

**From docs to code**
- API Reference links to specific source files and line numbers
- Architecture docs reference package directories
- Contributing Guide references specific code style configs

**Bidirectional linking**
- Every user-facing feature documented in both a user guide and API reference (if applicable)
- Release Notes link to specific guide sections for new/changed features

---

## 3. Core Documents to Write

### 3.1 Getting Started Guide

**Location:** `docs/getting-started/quick-start.md`

**Sections:**
1. Welcome — what Dusk is and who it's for (2–3 sentences, calm tone)
2. Prerequisites — OS version, hardware, any network requirements
3. Install — platform-agnostic overview with links to Installation Guide
4. First launch — what you see, what to do first
5. Connect a provider — step-by-step for a default provider (e.g., OpenAI)
6. Create your first workspace — concept explanation, creation flow
7. Send your first message — basic chat interaction
8. Explore — what to try next (links to Workspaces Guide, Agents Guide)

**Success metric:** User completes all steps in under 10 minutes without leaving the doc.

### 3.2 Installation Guide

**Location:** `docs/getting-started/installation.md`

**Sections per platform:**
- System requirements (OS version, RAM, disk, network)
- Download options (direct, package manager, enterprise)
- Install steps (GUI installer, CLI verification)
- First-run permissions (macOS: Accessibility, Automation; Windows: Defender SmartScreen; Linux: AppArmor/SELinux notes)
- Uninstall steps
- Troubleshooting per platform (permissions, corrupted install, update failures)

**Additional sections:**
- Portable mode (no installer, runs from directory)
- Enterprise deployment (MSI, PKG, silent install, configuration profiles)
- Offline installation (air-gapped environments)

### 3.3 Quick Start Tutorial

**Location:** `docs/getting-started/quick-start.md`

**Structure:**
- 5-step tutorial, ~30 minutes total
- Step 1: Install and launch (5 min)
- Step 2: Configure a provider and send a test message (5 min)
- Step 3: Create a workspace and organize files (5 min)
- Step 4: Run your first agent task (10 min)
- Step 5: Customize your theme and shortcuts (5 min)

Each step includes:
- Clear objective
- Numbered actions
- Expected outcome
- What to do if something goes wrong

### 3.4 Workspaces Guide

**Location:** `docs/guides/workspaces.md`

**Sections:**
1. Workspace concept — why workspaces exist, how they differ from folders
2. Creating a workspace — wizard, default settings
3. Workspace structure — chats, files, agents, settings
4. Organizing workspaces — naming, grouping, switching
5. Workspace settings — provider overrides, agent config, permissions
6. Import/export — moving workspaces between machines
7. Workspace lifecycle — archive, delete, restore
8. Multi-workspace workflows — using multiple workspaces simultaneously

### 3.5 Providers & Models Guide

**Location:** `docs/guides/providers-and-models.md`

**Sections:**
1. Provider concept — abstraction layer, why it exists
2. Built-in providers — OpenAI, Anthropic, Google, Ollama, Fugoku Gateway
3. Custom providers — OpenAI-compatible endpoints, configuration
4. API key management — storage, rotation, security
5. Model selection — per-workspace and per-agent overrides
6. Model capabilities — context window, tool use, vision, streaming
7. Cost and usage — token counting, cost estimation, provider comparison
8. Fallback and routing — Fugoku Gateway features (Phase 2+)
9. Troubleshooting provider issues — auth, rate limits, connectivity

### 3.6 Agents Guide

**Location:** `docs/guides/agents.md`

**Sections:**
1. Agent concept — workers with context, tools, and artifacts
2. Agent types overview — Workspace, Task, Specialist, Orchestrator, System
3. Workspace Agent — default behavior, context, configuration
4. Task Agents — spawning, lifecycle, monitoring, artifacts
5. Specialist Agents — templates, creation, tool permissions, sharing
6. Orchestrator Agents — routing, multi-agent workflows (Phase 2+)
7. Agent configuration — model selection, tool allowlists, permissions, memory
8. Artifact ownership — how agents produce and manage files
9. Agent scheduling — triggers, events, webhooks (Phase 2+)
10. Monitoring and logs — activity feed, token usage, error states

### 3.7 Files & Artifacts Guide

**Location:** `docs/guides/files-and-artifacts.md`

**Sections:**
1. File system model — workspace as root, agent-accessible paths
2. Creating files — chat, agent output, manual creation
3. Artifact types — code files, documents, data exports, images
4. File operations — read, write, rename, delete, versioning
5. Artifact chains — one agent's output as another's input
6. Import/export — workspace bundles, standalone files
7. Sync and backup — local-first, Fugoku Cloud sync (Phase 3)

### 3.8 Theme Customization Guide

**Location:** `docs/guides/theme-customization.md`

**Sections:**
1. Theme system overview — Dusk default, custom themes, sharing
2. Built-in themes — Dusk (twilight tones), Light, Dark, High Contrast
3. Customizing colors — palette editor, semantic colors, export/import
4. Typography — font selection, sizing, line height
5. Motion and animation — reduced motion, animation intensity
6. Layout — density, sidebar behavior, panel sizes
7. Per-workspace themes — workspace-specific overrides
8. Theme sharing — export theme files, community themes (future)

### 3.9 Keyboard Shortcuts Reference

**Location:** `docs/reference/keyboard-shortcuts.md`

**Sections:**
1. Overview — shortcut philosophy, modifier keys by platform
2. Global shortcuts — app-level commands
3. Workspace shortcuts — navigation, creation, switching
4. Chat shortcuts — message input, history, actions
5. Agent shortcuts — spawning, monitoring, lifecycle
6. File shortcuts — creation, navigation, operations
7. Customization — remapping, exporting, importing
8. Platform notes — macOS vs Windows vs Linux differences

### 3.10 Troubleshooting Guide

**Location:** `docs/reference/troubleshooting.md`

**Sections:**
1. Diagnostic tools — built-in diagnostics, log locations
2. Common issues by category:
   - Installation and startup
   - Provider connectivity
   - Model errors (timeout, quota, auth)
   - Agent failures
   - File and artifact issues
   - Performance (slow responses, memory)
   - Sync and backup
3. Log collection — how to gather logs for support
4. Resetting state — safe reset procedures, data preservation
5. Getting help — community channels, support contact, bug reports

---

## 4. Developer Documentation

### 4.1 Architecture Overview

**Location:** `docs/developer/architecture.md`

**Sections:**
1. System overview — high-level architecture diagram
2. Electron layer — main process responsibilities, IPC server
3. Service container — IoC pattern, service lifecycle
4. Provider system — abstraction, adapters, routing
5. Agent runtime — lifecycle, memory, tools, MCP integration
6. Data layer — better-sqlite3 schema, migrations, data flow
7. Renderer layer — React app structure, state management
8. Build and package — electron-builder, signing, distribution
9. Extension points — plugin system, MCP, automation hooks

**Diagrams:** Include architecture diagram, data flow diagram, agent runtime state machine.

### 4.2 Contributing Guide

**Location:** `docs/developer/contributing.md`

**Sections:**
1. Getting started — cloning, prerequisites, initial setup
2. Development workflow — branching, commits, PRs
3. Code standards — TypeScript, ESLint, Prettier, conventions
4. Testing — Vitest, Playwright, coverage requirements
5. Documentation — how to write docs, doc PRs, style enforcement
6. Review process — who reviews what, CI requirements
7. Community — code of conduct, communication channels

### 4.3 API Reference

**Location:** `docs/developer/api-reference/`

**ipc.md**
- IPC channel inventory
- Request/response schemas
- Error codes
- Authentication and security
- Versioning

**plugin-system.md**
- Plugin manifest format
- Lifecycle hooks (install, enable, disable, uninstall)
- Available APIs and permissions
- Example plugins
- Security model (sandboxing, permissions)

**automation.md**
- CLI commands (if applicable)
- HTTP endpoints for automation
- WebSocket events
- Scripting interface

### 4.4 Building from Source

**Location:** `docs/developer/building-from-source.md`

**Sections:**
1. Prerequisites — Node version, pnpm, platform-specific dependencies
2. Cloning and setup — git clone, pnpm install, env configuration
3. Development build — running in dev mode, hot reload
4. Production build — building distributables, signing
5. Platform-specific notes — macOS notarization, Windows signing, Linux packaging
6. Troubleshooting build failures

### 4.5 Release Process

**Location:** `docs/developer/release-process.md`

**Sections:**
1. Versioning — semantic versioning, version bumps
2. Pre-release checklist — tests, docs, changelog
3. Build pipeline — CI steps, artifact generation
4. Distribution — GitHub releases, package managers, auto-update
5. Post-release — announcement, monitoring, hotfix process

---

## 5. In-App Help

### 5.1 Onboarding Flow Documentation

**Location:** `docs/in-app-help/onboarding.md`

**Specification for the in-app first-run experience:**

**Flow design:**
1. Welcome screen — brief product statement, "Get started"
2. Provider setup — add at least one provider (guided, with test message)
3. Workspace creation — create first workspace, explain concept
4. First agent interaction — guided message to default agent
5. Next steps — suggested actions based on user type

**Content inventory:**
- All onboarding screens with copy, layout notes, and exit conditions
- Conditional paths (e.g., if user already has provider keys, skip provider setup)
- Progress indicators and skip options
- Telemetry considerations (what to track, what not to track)

**Handoff criteria:**
- Onboarding complete when: provider configured, workspace created, first message sent, or user explicitly skips

### 5.2 Contextual Help System Design

**Location:** `docs/in-app-help/contextual-help.md`

**Design specifications:**

**Trigger types:**
- Empty states — first-time view of a panel (workspace empty, no agents configured)
- Hover tooltips — icon explanations, field hints
- Inline help — contextual panels within settings forms
- Error context — help links within error messages
- Feature discovery — subtle hints for undiscovered features (non-intrusive)

**Content structure:**
- Each help element has: title, body text (1–3 sentences), link to full doc page
- Help content stored as structured data (JSON/markdown) in `apps/desktop/src/renderer/src/content/help/`
- Support for localization from day one (keys, not inline text)

**Behavioral rules:**
- Tooltips dismiss on click outside, never on hover alone
- Empty state help includes a primary action and a "Learn more" link
- Help never blocks the primary workflow
- All help content searchable in doc site

### 5.3 Tooltips and Empty States

**Location:** `docs/in-app-help/tooltips.md`

**Content inventory:**

**Tooltips by feature area:**
- Workspace panel: workspace concept, switching, creating
- Agent panel: agent types, spawning, lifecycle indicators
- Chat input: markdown support, artifact attachment, slash commands
- Provider settings: provider concept, key management, model selection
- File manager: file operations, artifact types, sync status
- Settings: each setting group with brief explanation

**Empty states by feature area:**
- No workspaces: create first workspace guidance
- No agents: workspace agent ready, or spawn task agent
- No files: import or generate via agent
- No providers: add provider setup flow
- No activity: recent actions, suggestions

---

## 6. Documentation Tools

### 6.1 Recommended Doc Framework

**Primary: VitePress**

Rationale:
- Native Vue ecosystem alignment (Dusk uses React, but VitePress is Vue-based and lightweight)
- Fast build times, excellent developer experience
- Built-in search, versioning, and i18n support
- Markdown-centered — writers work in plain markdown, not MDX
- Strong theming support to match Dusk branding
- Static output — easy to host on any CDN or embed in Electron

**Alternative considered:** Docusaurus
- More mature plugin ecosystem
- Better for multi-framework projects
- Heavier build, more configuration
- Selected VitePress for speed and simplicity given Dusk's scope

**Setup:**
```
docs/
├── .vitepress/
│   ├── config.ts          # Site config, navigation, theme
│   ├── theme/
│   │   ├── index.ts       # Custom theme entry
│   │   └── custom.css     # Dusk-branded styles
│   └── components/        # Shared Vue components for docs
├── public/
│   └── images/            # Screenshots, diagrams, favicon
├── guide/                 # User guides (mapped from docs/guides/)
├── reference/             # API and reference (mapped from docs/reference/)
├── developer/             # Developer docs (mapped from docs/developer/)
└── index.md               # Landing page
```

### 6.2 Search Integration

**Requirements:**
- Full-text search across all docs
- Keyboard-accessible, instant results
- Search within doc site and cross-link to in-app help

**Implementation:**
- VitePress built-in search (minisearch) for doc site
- Local search index bundled with static output — no external service required
- In-app help search uses same index, loaded in Electron renderer

**Future (Phase 2+):**
- Algolia DocSearch for public doc site
- Unified search across docs, changelog, and community forum

### 6.3 Versioning Strategy

**Approach:** Docs versioned alongside product releases

**Structure:**
- `/` — latest release docs
- `/v1.x/` — versioned docs for past releases
- Each release branch contains snapshot of docs at that version

**Update process:**
- Cut docs branch when release branch is created
- Only patch documentation fixes in release branches
- Main branch always reflects latest development state

**In-app help:**
- Bundled with application version
- Help content updates with app updates (no separate versioning)
- Fallback to web doc site for latest content when online

---

## 7. Content Standards

### 7.1 Writing Style Guide

**Sentence structure**
- Prefer short sentences (15–20 words average)
- One idea per sentence
- Use active voice: "Click Save to apply changes" not "Changes can be applied by clicking Save"

**Procedure format**
```
1. Open **Settings** > **Providers**.
2. Click **Add Provider**.
3. Select your provider from the list.
4. Enter your API key and click **Verify**.
```

**Heading hierarchy**
- H1: page title only (one per page)
- H2: major sections
- H3: subsections
- H4: rarely used, avoid if possible

**Terminology consistency**
- Use the terminology table from Section 1.3
- Do not invent synonyms (e.g., never call a workspace a "project" or "environment")
- Define new terms on first use in a section

### 7.2 Code Snippet Standards

**Formatting**
```typescript
// Use language-specific syntax highlighting
import { createWorkspace } from '@dusk/workspace'

const workspace = await createWorkspace({
  name: 'My Project',
  provider: 'openai',
  model: 'gpt-4o'
})
```

**Rules:**
- Always include syntax highlighting tag
- Show realistic, minimal examples — not full API calls with every parameter
- Include comments only for non-obvious lines
- Show expected output or result when relevant
- Use consistent casing and naming matching the codebase
- Never include API keys, tokens, or secrets in examples
- For multi-line examples, show complete runnable snippets
- For CLI commands, show prompt + output:

```bash
$ dusk workspace create "My Project"
✓ Workspace created: /Users/ro/Dusk/My Project
```

### 7.3 Screenshot and Video Guidelines

**Screenshots**
- Native resolution, no scaling artifacts
- Consistent theme (use Dusk default theme unless demonstrating theme features)
- Annotate with numbered callouts or arrows for multi-step procedures
- Include relevant UI chrome (title bar, sidebar) — avoid cropped "floating" screenshots
- Retina/HiDPI captures for all platforms

**Video**
- 1080p minimum, 30fps
- Under 3 minutes for tutorials
- Include captions for accessibility
- Provide transcript in markdown alongside video
- Use native screen recording (QuickTime, Xbox Game Bar, OBS) — no third-party watermark

**Diagrams**
- Use Architecture Diagram skill or Excalidraw for system diagrams
- Consistent color palette: cyan=frontend, emerald=backend, violet=database, amber=cloud
- Include legend for all diagrams
- Export as SVG for doc site, PNG for in-app display

### 7.4 Accessibility for Docs

**WCAG 2.1 AA compliance for doc site**
- All images have descriptive alt text
- Color is not the only indicator (use icons + labels in diagrams)
- Keyboard navigation works for all interactive elements
- Sufficient color contrast for text (4.5:1 minimum)
- Resizable text without loss of content or functionality

**In-app help accessibility**
- Screen reader labels for all help elements
- Keyboard-dismissible tooltips and modals
- Focus management during onboarding flow
- Reduced motion support for all animations

**Content accessibility**
- Tables have headers and captions
- Code snippets have sufficient contrast
- Acronyms defined on first use (e.g., "Model Context Protocol (MCP)")
- Avoid relying on color alone in instructions ("click the blue button" → "click the **Submit** button")

---

## 8. Appendix: Documentation Sprint Plan

### Sprint 1 (Week 1–2): Foundation
- [ ] Set up VitePress doc site with Dusk branding
- [ ] Write Getting Started Guide (installation, quick start, first workspace)
- [ ] Write Workspaces Guide
- [ ] Write Providers & Models Guide
- [ ] Set up cross-linking and navigation

### Sprint 2 (Week 3–4): Core User Guides
- [ ] Write Agents Guide
- [ ] Write Files & Artifacts Guide
- [ ] Write Theme Customization Guide
- [ ] Write Keyboard Shortcuts Reference
- [ ] Write Troubleshooting Guide

### Sprint 3 (Week 5–6): Developer Docs
- [ ] Write Architecture Overview
- [ ] Write Contributing Guide
- [ ] Write API Reference (IPC, plugin system)
- [ ] Write Building from Source

### Sprint 4 (Week 7–8): In-App Help & Polish
- [ ] Design and document onboarding flow
- [ ] Design contextual help system
- [ ] Write tooltip and empty state content inventory
- [ ] Write Release Notes template and initial changelog
- [ ] Write Enterprise docs (deployment, security, administration)

### Ongoing (Per Release)
- [ ] Update Release Notes
- [ ] Update Changelog
- [ ] Update affected guides for new/changed features
- [ ] Review and update screenshots/diagrams

---

*This plan is the north star for Dusk documentation. All doc work feeds back into it. Update as the product and team evolve.*
