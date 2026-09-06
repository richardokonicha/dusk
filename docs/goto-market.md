# Dusk — Go-to-Market Strategy

## 1. Positioning & Messaging

### Elevator Pitches

**10 seconds**
> Dusk is the calm desktop work environment for AI — not another chat app, not a studio, but the place your AI work actually lives.

**30 seconds**
> Most AI tools are apps you open for a single task and close. Dusk is a Work OS: a desktop environment where your AI conversations, files, agents, and model providers live together in persistent workspaces. It works standalone with any provider, and connects to Fugoku when you need compute and unified billing.

**2 minutes**
> If you do knowledge work — development, analysis, writing, research — you've probably accumulated a collection of AI tools: one for chat, one for code, one for file uploads. Context fragments across them. Nothing holds it together.
>
> Dusk is a standalone desktop Work OS that solves this. It gives you persistent workspaces where your files, conversations, agents, and tool integrations live as first-class objects. You bring your own models — OpenAI, Anthropic, local, any OpenAI-compatible endpoint — with no lock-in. Agents are workers in your workspace, not just chat personas: they read and write artifacts, use tools, and remember context across sessions.
>
> Dusk is calm and focused by design. It's not marketed as an "AI Studio" or a chat client. It's the environment where AI-assisted work settles into focus. And when you outgrow self-hosted inference or need unified billing and GPU compute, Fugoku Gateway and Fugoku Cloud plug in as an upgrade path — not a requirement.
>
> Desktop-first on Mac, Windows, and Linux.

### Core Value Proposition

> **Dusk is where your AI work lives.**
>
> One desktop workspace. Every model provider. Agents that produce real artifacts. Calm by default, powerful when you need it.

**Three pillars:**
1. **Workspace, not chat** — persistent project containers for files, history, and agents
2. **Any provider, no lock-in** — bring your own API keys, route through Fugoku Gateway when ready
3. **Calm professional environment** — dark theme, focused layout, no noise

### Key Differentiators

| Dimension | Dusk | Dusk Studio | Open WebUI | Cursor | Claude Code | Poe |
|---|---|---|---|---|---|---|
| Positioning | Work OS | AI client | Self-hosted web UI | AI IDE | Agentic CLI | Chat aggregator |
| Scope | Workspace + files + agents + models | Chat + assistants | Chat + models (web) | Code-first IDE | Code agent CLI | Multi-model chat |
| Desktop native | ✅ First-class | ✅ | ❌ Web-first | ✅ | ✅ (CLI/TUI) | ❌ Web + mobile |
| Workspace concept | ✅ Core primitive | ❌ Conversations only | ❌ | ❌ Projects only | ❌ | ❌ |
| Agent model | Workers with artifacts | Assistants (prompts) | Assistants | Composer/agent | Agentic tasks | Bots |
| Provider freedom | ✅ Any OpenAI-compatible | ✅ Many | ✅ Many | ✅ + own | Anthropic only | ✅ Many |
| Local-first | ✅ Default | ✅ | ✅ | ✅ | ✅ | ❌ |
| Fugoku on-ramp | ✅ Gateway + Cloud | ❌ | ❌ | ❌ | ❌ | ❌ |
| Professional calm | ✅ Core brand | ❌ "AI Studio" feel | ❌ Hacker/self-host vibe | ❌ IDE/IDE-heavy | ❌ Terminal-only | ❌ Chat-heavy |
| Target audience | Professionals doing AI work | General AI users | Self-host enthusiasts | Developers | Developers | Casual + power users |

**vs Dusk Studio (lineage):** Dusk inherits Dusk's desktop-native, multi-provider foundation but rebrands from "AI client/studio" to "Work OS" — adding persistent workspaces, artifact-centric agents, and professional positioning. Dusk targets general AI users; Dusk targets professionals whose daily work involves AI.

**vs Open WebUI:** Open WebUI is a self-hosted enthusiast project. Dusk is a polished commercial desktop product for professionals who want local-first without managing Docker containers and web UIs.

**vs Cursor:** Cursor is an AI-first IDE. Dusk is provider-agnostic and covers all AI work — not just code. If you write, analyze data, research, or manage projects alongside coding, Dusk is your environment; Cursor is your editor.

### Taglines & Brand Voice

**Primary taglines:**
- "The calm work environment for AI"
- "Your AI work, in one place"
- "Workspace, not chat"

**Secondary / feature-specific:**
- "Every provider. One workspace."
- "Agents that produce, not just chat"
- "Local-first. Fugoku-ready."

**Brand voice guidelines:**
- Tone: calm, precise, professional. Not hype. Not startup-bro energy.
- Avoid: "AI-powered," "revolutionary," "game-changer," emoji-heavy copy
- Use: concrete nouns, active verbs, specific claims
- Write for someone who spends 6+ hours/day at a computer and values clarity over excitement
- Dark theme aesthetic should extend to brand materials — dusk palette, muted tones, high contrast text

### Target User Personas

#### Persona 1: The Professional Analyst

**Name:** Sarah
**Role:** Senior Data Analyst / Consultant
**Age:** 32
**Tech comfort:** High — uses SQL, Python, Tableau, multiple AI tools
**Work pattern:** Juggles 3-5 client projects simultaneously. Each has its own context: datasets, reports, past analyses, stakeholder requests.
**AI usage today:** Uses ChatGPT for ad-hoc analysis, Cursor for SQL/code, Claude for drafting reports. Context is scattered. Re-explains project background in every new chat.
**Pain points:**
- Re-explaining context to every new AI session
- AI outputs in chat bubbles that must be manually copied to reports
- No persistent project memory for AI interactions
- Paying for multiple subscriptions
**Dusk appeal:**
- One workspace per client/project — AI remembers the context
- Agents that write analysis artifacts directly to project files
- Any provider — use what's cheapest/most capable per task
- Fugoku Gateway for cost control across heavy analysis workloads
**Success moment:** Creates a workspace for a client engagement, drops in the dataset, and an analyst agent produces a full report artifact — no copy-paste, no re-explaining context.

#### Persona 2: The Developer-Technical Writer

**Name:** Marcus
**Role:** Developer Advocate / Technical Writer
**Age:** 28
**Tech comfort:** Very high — writes code, docs, blog posts, manages open-source presence
**Work pattern:** Writes documentation, tutorials, and code samples. Needs AI for drafting, reviewing, and generating examples across multiple languages and frameworks.
**AI usage today:** Cursor for code, ChatGPT for drafting, Poe for model comparison, GitHub Copilot inline.
**Pain points:**
- Switching between code editor and chat windows
- AI-generated code in chat that must be manually moved to files
- No unified place for docs + code + AI conversations
- IDE-specific AI tools lock you into that editor
**Dusk appeal:**
- Workspace contains markdown docs, code files, and AI conversations together
- Agents that generate code artifacts, doc drafts, and review outputs as files
- Provider-agnostic — compare models inside the same workspace
- Desktop-native — works with any editor, not tied to an IDE
**Success moment:** Opens a Dusk workspace for a new tutorial, drops in a repo, and a writer agent produces a draft with inline code examples — all as workspace files, ready to edit in any editor.

#### Persona 3: The Research-Intensive Professional

**Name:** Dr. Amara Osei
**Role:** Policy Researcher / Academic-Adjacent
**Age:** 38
**Tech comfort:** Moderate-high — uses Zotero, Notion, Excel, basic Python/R
**Work pattern:** Reads papers, synthesizes sources, drafts reports and briefs. Manages literature reviews across dozens of documents.
**AI usage today:** Claude for synthesis, perplexity for search, ChatGPT for drafting. Copies AI outputs into Word/Google Docs manually.
**Pain points:**
- AI summaries exist in chat history, disconnected from source documents
- No way to build a persistent knowledge base that AI can reference
- Manual copy-paste between AI tools and writing tools
- Concerned about data leaving local machine for sensitive research
**Dusk appeal:**
- Workspace with files and conversations in one place — drop in PDFs, notes, drafts
- Local-first — sensitive research data stays on machine
- Researcher agent that reads workspace files and produces synthesis artifacts
- Fugoku Cloud for compute-heavy analysis when needed, with opt-in sync
**Success moment:** Creates a workspace for a literature review, adds 20 papers, and a researcher agent produces an annotated bibliography and synthesis report — all as files in the workspace.

---

## 2. Market Analysis

### Market Size & Opportunity

**Addressable market:** Professionals who use AI as part of their daily work.

- Global knowledge workers: ~1.3B (ILO estimate, 2024)
- AI-tool-using knowledge workers (early adopters): ~200-300M
- Professionals who would pay for a dedicated AI Work OS: ~30-50M
- Desktop-app-preferring segment (vs. web-only): ~15-25M
- Target TAM (willing to pay $50-200/yr): $750M - $5B annually

**Adjacent markets:**
- IDE plugins (Cursor, Copilot): ~10M developers, $1B+ market
- Enterprise AI platforms: Large but competitive (Microsoft, Google)
- Self-hosted AI (Ollama, Open WebUI): Growing fast, underserved on polish/professionalism

**Market dynamics:**
- "AI chat" is commoditizing; differentiation is shifting to workflow integration
- Local-first and privacy are becoming purchase criteria, not nice-to-haves
- Desktop-native is under-served (most new tools are web-first)
- The "AI Studio" lane is crowded; the "Work OS" lane is open

### Competitive Landscape Matrix

| Competitor | Primary lane | Pricing | Desktop | Workspace | Provider lock-in | Professional positioning | Local-first |
|---|---|---|---|---|---|---|---|
| **Dusk Studio** | AI client | Free/open | ✅ | ❌ | ❌ | ❌ Casual | ✅ |
| **Open WebUI** | Self-hosted web UI | Free/OSS | ❌ | ❌ | ❌ | ❌ Hacker | ✅ |
| **Cursor** | AI IDE | $20/mo | ✅ | ❌ | ⚠️ Partial | ✅ Dev | ✅ |
| **Claude Code** | Agentic CLI | Included | ✅ (CLI) | ❌ | ✅ Anthropic | ✅ Dev | ✅ |
| **Poe** | Chat aggregator | Freemium | ❌ | ❌ | ❌ | ❌ Casual | ❌ |
| **ChatGPT Desktop** | Chat client | Freemium | ✅ | ❌ | ✅ OpenAI | ❌ Casual | ❌ |
| **Dusk (target)** | Work OS | TBD | ✅ | ✅ | ❌ | ✅ Professional | ✅ |

### Whitespace Opportunity

The gap Dusk occupies: **professional, desktop-native, workspace-centric, provider-agnostic, local-first**.

- Dusk and Open WebUI serve enthusiasts but lack professional polish and workspace architecture
- Cursor serves developers but is IDE-bound and provider-partial
- ChatGPT/Claude Code/Poe are chat or CLI-first, not workspace environments
- No product positions itself as "the calm work environment for AI" — the "calm" positioning is entirely open

**The whitespace is:** professionals who use AI across multiple tasks (not just coding) and want a single, calm, local-first desktop environment that grows with them — from individual use to team workspaces and compute scaling via Fugoku.

### Pricing Positioning

**Market context:**
- Freemium chat tools (ChatGPT, Poe) set expectation: basic use free, advanced features paid
- IDE AI (Cursor, Copilot): $15-25/month per user, high penetration among developers
- Open-source self-hosted (Open WebUI, Ollama): free, community-supported, no SLA
- Enterprise AI platforms: $30-100+/user/month, contracts, sales cycles

**Dusk positioning:**
- Target: professionals who value their work environment and will pay for quality
- Price signal: "professional tool, not a free utility, not an enterprise contract"
- Recommended anchor: $12-15/month individual, $20-30/user/month team
- Free tier: local-only, single workspace, community support
- Paid tier: multiple workspaces, Fugoku Gateway routing, priority support
- Team/enterprise: shared workspaces, admin controls, SLA, Fugoku Cloud compute

---

## 3. Launch Strategy

### Phase 1 — MVP Launch (Month 1-3)

**Goal:** Ship a polished, usable standalone desktop client that works with any OpenAI-compatible provider. Prove the "calm Work OS" concept with early adopters.

**Launch scope:**
- Desktop apps (macOS, Windows, Linux)
- Workspace model (create, switch, local storage)
- Provider configuration (OpenAI, Anthropic, custom endpoints, local models)
- Chat with streaming
- Basic file/artifact handling (upload, save agent outputs as files)
- Agent with basic tool use (MCP, file operations)
- Local-first data model
- Dusk branding, dark theme, calm UI

**Out of scope for MVP:**
- Fugoku Gateway integration (Phase 2)
- Fugoku Cloud compute (Phase 3)
- Team workspaces
- Advanced agent orchestration
- Plugin/extension marketplace

### Launch Channels

**Primary channels (ranked by priority):**

1. **Hacker News (Show HN)**
   - Target: engineers, founders, early adopters
   - Timing: Tuesday-Thursday, 8-10am EST
   - Angle: "Desktop AI Work OS — workspace-centric, provider-agnostic, local-first"
   - Expected: 200-500 upvotes, 1000-3000 visits, 500-1500 downloads
   - Follow-up: engage every comment, post a detailed technical explanation

2. **Product Hunt**
   - Target: product hunters, indie hackers, early adopters
   - Timing: Launch on a Tuesday (highest traffic day)
   - Angle: "A calm work environment for AI — not a chat client, not a studio"
   - Preparation: 20+ upvotes from community before launch day
   - Expected: 300-600 upvotes, top 5 product of the day

3. **Reddit**
   - r/MachineLearning: technical post on workspace architecture and provider-agnostic design
   - r/LocalLLaMA: local-first + any provider angle
   - r/selfhosted: desktop local-first AI environment
   - r/productivity: work environment for AI-assisted professionals
   - Rule: no link dropping. Earn discussion with value-first posts.

4. **Twitter/X**
   - Technical audience: developers, AI practitioners, productivity enthusiasts
   - Content: screenshots, demo clips, comparison threads (Dusk vs Dusk vs Open WebUI)
   - Accounts to engage: @swyx, @karpathy, @jimfan, @bindureddy, AI tool reviewers
   - Thread series: "Why I built a Work OS instead of another AI chat app"

5. **LinkedIn**
   - Target: professional analysts, researchers, technical managers
   - Content: longer-form posts on AI workflow problems, Dusk as solution
   - Less viral but higher-intent audience for paid conversion

### Launch Timeline & Milestones

**Weeks 1-4: Pre-launch build**
- Week 1: Finalize MVP feature set, lock branding
- Week 2: Build core workspace + chat + provider model
- Week 3: Polish UI, packaging (mac/win/linux), installer creation
- Week 4: Internal dogfooding, bug fixes, prepare launch assets

**Weeks 5-6: Pre-launch (soft)**
- Week 5: Build landing page (dusk.so or similar), open waitlist
- Post on HN/r/LocalLLaMA: "Building a desktop AI Work OS — looking for beta testers"
- Recruit 50-100 beta testers from target communities
- Create demo video (2-3 min), screenshots, GIFs

**Week 7: Public launch**
- Day 1 (Tuesday): Product Hunt launch
- Day 2 (Wednesday): Show HN post
- Day 3 (Thursday): Reddit posts (r/MachineLearning, r/LocalLLaMA)
- Day 4-5: Twitter thread series, LinkedIn posts
- Week 8: Engage feedback, iterate on first-week issues

**Weeks 9-12: Post-launch**
- Publish blog posts (see Content Strategy)
- Start Discord community
- Begin Fugoku Gateway integration (Phase 2)
- Collect testimonials, case studies
- Plan first update/patch release

### Beta Program Design

**Program name:** Dusk Early Light
**Size:** 200-300 participants
**Duration:** 4-6 weeks pre-launch

**Recruitment:**
- Primary: HN, r/LocalLLaMA, r/selfhosted, Twitter — professionals who currently use 2+ AI tools
- Secondary: Fugoku community, Dusk Studio power users, developer communities
- Requirement: active daily AI user, comfortable with pre-release software, willing to give feedback

**Structure:**
- Private Discord/Telegram for beta testers
- Weekly feedback prompts (async, not meetings)
- Bug bounty: $50-200 per confirmed critical bug
- Early access to Fugoku Gateway integration for testers who want it
- Beta tester recognition on website (with permission)

**Selection criteria:**
- Uses 2+ AI tools daily
- Desktop-first workflow
- Comfortable with local models / custom endpoints
- Representative of target personas (analyst, dev-writer, researcher)

### Early Adopter Acquisition

**Acquisition channels:**
1. **Community seeding** — HN, Reddit, Discord communities where target users gather
2. **Referral program** — beta testers who refer 3 active users get 6 months free
3. **Comparison content** — "Dusk vs Dusk Studio: Why I switched" type posts from beta testers
4. **Creator partnerships** — productivity YouTubers, AI tool reviewers, developer advocates
5. **Fugoku ecosystem** — existing Fugoku Gateway users as natural early adopters

**Acquisition targets (first 90 days):**
- Month 1: 5,000 downloads, 500 active users
- Month 2: 15,000 downloads, 2,000 active users
- Month 3: 30,000 downloads, 5,000 active users

---

## 4. Content Strategy

### Blog/Content Topics

**Launch month (foundational):**

1. **"Why I built a Work OS instead of another AI chat app"** — founder story, design philosophy
2. **"The workspace is the missing primitive in AI tools"** — architectural argument for workspace-centric design
3. **"Dusk Studio taught us what works. Here's what we're changing."** — honest lineage post
4. **"Local-first AI: why your data should stay on your machine"** — privacy and control
5. **"How to evaluate AI providers (and why you shouldn't be locked in)"** — educational, positions Dusk as provider-agnostic

**Post-launch (ongoing):**

6. **"Building an agent that produces artifacts, not just chat"** — technical deep-dive on agent design
7. **"Fugoku Gateway: cost control for your AI workspace"** — Fugoku integration
8. **"From chat to workspace: a workflow migration guide"** — helps users from other tools adopt Dusk
9. **"The calm design philosophy behind Dusk"** — design/UX content
10. **"Case study: How a policy researcher uses Dusk for literature reviews"** — persona content
11. **"Open WebUI vs Dusk: which desktop AI environment?"** — honest comparison
12. **"Building custom agents in Dusk"** — tutorial content for power users
13. **"The economics of AI providers: why routing matters"** — Fugoku Gateway value prop
14. **"Dusk under the hood: how we built a provider-agnostic desktop app"** — engineering content

### Demo Videos & Screenshots

**Launch assets:**
- **Hero demo video (2-3 min):** Install → create workspace → add provider → chat with model → agent produces artifact → file appears in workspace. Show the full loop.
- **Feature clips (30-60 sec each):** Workspace switching, provider configuration, agent tool use, file handling
- **Screenshot set (8-12 images):** Hero workspace, chat view, agent artifact output, provider settings, file browser, dark theme showcase
- **Comparison GIFs:** Dusk vs Dusk chat-only, Dusk vs Open WebUI (desktop polish)
- **Onboarding walkthrough:** First 5 minutes with Dusk

**Distribution:**
- Landing page (hero video)
- Product Hunt (screenshots + GIFs)
- YouTube (demo + walkthrough)
- Twitter/LinkedIn (clips)

### Documentation Strategy

**Tiers:**

1. **Quickstart (5 min):** Install → configure provider → first chat → first artifact
2. **Core guides:** Workspaces, providers, agents, files, MCP integration
3. **Advanced:** Custom agents, Fugoku Gateway setup, team workspaces (when shipped)
4. **Reference:** Provider compatibility matrix, MCP server list, keyboard shortcuts, config schema

**Principles:**
- Every feature has a getting-started doc within 48 hours of shipping
- Searchable, versioned, hosted at docs.dusk.so
- Contributable (open source) — community can improve docs
- Video transcripts for accessibility

### Community Building

**Primary: Discord**
- Channels: #general, #help, #showcase, #fugoku-gateway, #beta, #contributors
- Weekly office hours (async): founder Q&A threads
- Monthly showcase: users share workflows
- Bug reports → GitHub issues linked from Discord

**Secondary: GitHub**
- Discussions for feature requests, roadmap feedback
- Issues for bugs
- Actions/workflows for transparency

**Tertiary: Twitter**
- Product updates, tips, community highlights
- Technical threads on architecture decisions

**Community milestones:**
- Week 4: Discord server live (pre-launch)
- Month 2: 500+ Discord members
- Month 3: First community-contributed agent templates

---

## 5. Pricing & Distribution

### Pricing Model

**Recommended: Freemium + Paid tiers + Enterprise**

| Tier | Price | Target | Features |
|---|---|---|---|
| **Free** | $0 | Individual users, evaluators | 1 workspace, local providers, community support, full core features |
| **Pro** | $12/month or $108/yr | Power users, professionals | Unlimited workspaces, Fugoku Gateway routing, priority support, advanced agent config |
| **Team** | $24/user/month | Small teams | Shared workspaces, team admin, Fugoku Gateway + billing, SLA |
| **Enterprise** | Custom | Organizations | SSO, audit logs, dedicated support, Fugoku Cloud compute, custom deployment |

**Rationale:**
- Free tier removes friction — try before you buy, no credit card
- Pro price signals quality without being expensive ($12 is "skip one coffee")
- Team tier enables viral growth (teams adopt together)
- Enterprise captures Fugoku funnel at scale

**Pricing psychology:**
- Annual discount (20% off) improves LTV and reduces churn
- Pro tier includes Fugoku Gateway value prop — justifies upgrade beyond "more workspaces"

### Distribution Channels

**Direct (primary):**
- Website download: dusk.so/download
- In-app updates (auto-update mechanism)
- License key management for paid tiers

**App stores (secondary):**
- Mac App Store — required for many enterprise Mac deployments
- Microsoft Store — enterprise Windows distribution
- Snapcraft / Flathub — Linux desktop app stores
- Direct download (DMG, EXE, AppImage, DEB) for all platforms

**Package managers (developer convenience):**
- Homebrew (macOS): `brew install --cask dusk`
- Chocolatey (Windows)
- Winget (Windows)

**GitHub:**
- Releases page for changelogs and community feedback
- Star count as social proof
- Issue tracking for transparency

### Enterprise Sales Motion

**Motion:** Product-led → Sales-assisted for Team/Enterprise

1. **Land:** Individual professionals discover via HN/PH, use Free tier
2. **Expand:** User recommends to team, upgrades to Team tier
3. **Convert:** Team needs SSO, audit logs, SLA — sales conversation
4. **Fugoku upsell:** Enterprise team needs compute → Fugoku Cloud
5. **Contract:** Annual enterprise contract with Fugoku bundled or adjacent

**Sales approach:**
- Self-serve Team tier (up to 10 users) — no sales call needed
- Enterprise: qualify via inbound interest, 30-min demo, proposal within 1 week
- Pricing: $30-50/user/month enterprise, volume discounts, annual contracts
- Competitive displacement: target teams currently using Cursor Teams, GitHub Copilot Enterprise, or custom Open WebUI deployments

---

## 6. Partnership & Ecosystem

### Fugoku Gateway Integration Messaging

**Positioning:** Fugoku Gateway is the upgrade path, not the starting point.

**Messaging framework:**
- **For individual users:** "Route your models through Fugoku Gateway for unified billing, automatic fallback, and cost caps — when you're ready."
- **For teams:** "Fugoku Gateway gives your team shared model routing, cost allocation per workspace, and enterprise-grade uptime."
- **For enterprise:** "Fugoku Gateway + Dusk = your AI work environment with enterprise compute infrastructure. One vendor, one bill, full control."

**Integration touchpoints:**
1. **Setup wizard:** "Add Fugoku Gateway" as a provider option alongside OpenAI, Anthropic, etc.
2. **Dashboard widget:** Shows routing status, token usage, cost per workspace/agent
3. **Upgrade prompts:** When users hit rate limits or cost thresholds, suggest Fugoku Gateway
4. **Documentation:** Fugoku Gateway setup guide as a first-class doc

**Funnel math (target):**
- 10% of Dusk users try Fugoku Gateway within 12 months
- 30% of Gateway users upgrade to Fugoku Cloud within 12 months
- Fugoku revenue per Dusk user (blended): $5-15/month average

### Provider Partnership Opportunities

**Current:** Provider-agnostic (OpenAI-compatible API). No partnerships required.

**Future opportunities (Phase 3+):**
- **Anthropic / OpenAI:** Co-marketing for "works best with Dusk" positioning
- **Local model providers (Ollama, llama.cpp):** Bundled setup, optimization guides
- **Cloud GPU providers:** Fugoku Cloud as default, but third-party integrations for flexibility
- **MCP server ecosystem:** Partner with MCP tool providers for curated integration lists

### Community & Contributor Program

**Open source considerations:**
- Dusk core: proprietary (commercial product)
- Fugoku integration: open source (community contributions welcome)
- Agent templates: community-shareable (marketplace potential)
- Documentation: open contribution

**Contributor tiers:**
1. **Community:** Bug reports, docs, feedback (all users)
2. **Contributor:** Agent templates, MCP integrations, UI themes (requires CLA)
3. **Core team:** Maintained contributors with commit access (invitation-only)

**Recognition:**
- Contributor page on website
- Release notes shoutouts
- Beta access / free Pro tier for active contributors

---

## 7. Marketing Site Plan

### Site Structure

```
dusk.so/
├── /                        ← Homepage
├── /download                ← Download page (platform detection)
├── /features                ← Feature overview
│   ├── /workspaces
│   ├── /agents
│   ├── /providers
│   ├── /local-first
│   └── /fugoku-gateway
├── /pricing                 ← Pricing tiers
├── /docs                    ← Documentation hub
│   ├── /quickstart
│   ├── /guides
│   ├── /reference
│   └── /changelog
├── /blog                    ← Blog / content
├── /compare                ← Comparison pages
│   ├── /dusk-studio
│   ├── /open-webui
│   └── /cursor
├── /community              ← Community links (Discord, GitHub)
└── /enterprise             ← Enterprise sales page
```

### Key Pages

**Homepage (`/`)**
- Hero: "The calm work environment for AI" + demo video
- 3-pillar value props (Workspace, Any Provider, Calm)
- Social proof: testimonials, download count, HN/PH mentions
- CTA: Download for [platform] / Join waitlist
- Footer: links to docs, blog, community, Fugoku

**Download (`/download`)**
- Platform detection (mac/win/linux)
- Direct download buttons + package manager instructions
- System requirements
- Changelog link
- "What's new in this version"

**Features (`/features`)**
- 5-6 feature pages with screenshots
- Each page: problem → solution → how it works
- Agents page: artifact output, tool use, lifecycle
- Providers page: compatibility list, setup guides
- Local-first page: data model, privacy, sync opt-in

**Pricing (`/pricing`)**
- 3-tier table (Free / Pro / Enterprise)
- Feature comparison matrix
- FAQ: "Can I use Dusk without Fugoku?" "What happens to my data?"
- Annual/monthly toggle

**Docs (`/docs`)**
- Search bar
- Quickstart (5 min)
- Core guides
- Advanced guides
- Reference
- Changelog

**Compare pages (`/compare/`)**
- Honest, factual comparisons
- "Dusk vs Dusk Studio" — what we keep, what we change
- "Dusk vs Open WebUI" — desktop polish vs self-hosted flexibility
- "Dusk vs Cursor" — provider-agnostic vs code-only
- SEO targeting: "best desktop AI client," "Dusk Studio alternative," etc.

**Enterprise (`/enterprise`)**
- SSO, audit logs, SLA
- Fugoku Cloud compute options
- Contact form / Calendly link
- Case study (when available)

### SEO Strategy

**Primary keywords:**
- "desktop AI work environment"
- "AI work OS"
- "Dusk Studio alternative"
- "local-first AI client"
- "provider-agnostic AI tool"
- "AI workspace desktop"
- "self-hosted AI desktop app"
- "Open WebUI alternative desktop"

**Content SEO:**
- Blog posts targeting long-tail keywords
- Comparison pages (high intent, high conversion)
- Documentation as SEO surface (how-to queries)

**Technical SEO:**
- Fast loading (static site, optimized images)
- Structured data (SoftwareApplication schema for download pages)
- Open Graph / Twitter Cards for all pages
- Sitemap, robots.txt

**Link building:**
- Product Hunt, HN, Reddit referrers
- Guest posts on AI/productivity blogs
- Developer community mentions (Discord, forums)

---

## 8. Metrics & KPIs

### Launch Metrics (Days 1-30)

| Metric | Target | Source |
|---|---|---|
| Downloads | 5,000+ | Download server / app store analytics |
| Unique visitors | 10,000+ | Plausible / PostHog |
| HN upvotes | 200+ | HN post |
| Product Hunt upvotes | 300+ | PH dashboard |
| Beta signups | 500+ | Waitlist form |
| Active users (week 1) | 500+ | Telemetry (opt-in) |
| Reddit engagement | 100+ comments | Reddit posts |
| Twitter impressions | 100K+ | Twitter Analytics |

### Growth Metrics (Month 1-12)

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|---|---|---|---|---|
| Total downloads | 5K | 30K | 100K | 300K |
| Active users (MAU) | 1K | 5K | 20K | 60K |
| Daily active users | 200 | 1K | 5K | 15K |
| Retention (D7) | 40% | 45% | 50% | 55% |
| Retention (D30) | 20% | 25% | 30% | 35% |
| NPS | 30 | 40 | 50 | 60 |
| Discord members | 200 | 800 | 2K | 5K |
| GitHub stars | 500 | 2K | 5K | 15K |

### Business Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| MRR | $2K | $15K | $60K |
| Free → Pro conversion | 3% | 5% | 8% |
| Team customers | 5 | 25 | 100 |
| Enterprise pipeline | — | $50K ARR | $200K ARR |
| Fugoku Gateway activation | 2% of users | 5% of users | 10% of users |
| Churn (monthly) | 5% | 4% | 3% |
| ARPU | $8 | $12 | $15 |
| LTV:CAC | 3:1 | 4:1 | 5:1 |

### Measurement Infrastructure

**Tools:**
- Analytics: PostHog (open-source, privacy-friendly) or Plausible
- Error tracking: Sentry
- Uptime: UptimeRobot or similar
- Feedback: In-app NPS survey, Discord, email
- Revenue: Stripe (subscriptions), Paddle (if tax complexity)

**Dashboards:**
- Daily: Downloads, signups, active users
- Weekly: Retention, engagement, NPS, revenue
- Monthly: Growth rate, churn, LTV, Fugoku funnel metrics

---

## Appendix: Key Decisions & Assumptions

### Assumptions
1. Desktop-first is the right initial market (web app deferred)
2. Professionals will pay for a polished desktop Work OS
3. Provider-agnostic is a meaningful differentiator (not all users care, but enough do)
4. Fugoku Gateway creates a viable upgrade funnel
5. "Calm" positioning resonates with professionals fatigued by AI hype

### Key Risks
1. **Market education:** "Work OS" is not a known category. Requires explanation.
2. **Feature depth:** MVP must be good enough to retain users; shallow apps get abandoned.
3. **Competitor response:** Cursor or ChatGPT could add workspace features.
4. **Pricing pressure:** Open-source alternatives are free; conversion must be compelling.
5. **Fugoku dependency:** If Fugoku Gateway is not ready, one key differentiator is unavailable.

### Mitigations
1. Education through content (blog, videos, comparisons)
2. Focus MVP on depth: do 5 features well, not 20 poorly
3. Move fast on workspace/agent architecture — hard to replicate quickly
4. Free tier for evaluation; Pro value beyond "more workspaces" (Gateway, support)
5. Ship Dusk standalone-first; Fugoku integration is enhancement, not dependency
