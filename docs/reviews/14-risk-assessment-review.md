# Risk Assessment Review — Dusk Work OS

**Reviewer:** Risk Management  
**Date:** 2026-08-11  
**Sources:** master-plan.md, unified-roadmap.md, legal-framework.md, devops-release.md, testing-strategy.md, mobile-strategy.md  
**Classification:** Internal — Pre-Implementation Gate

---

## Executive Summary

The Dusk risk register captures the headline risks but has material gaps. Three risks require immediate action before any implementation begins: AGPL contamination boundary hardening, Electron security architecture, and Phase 1 timeline realism. The register underestimates likelihood on several fronts and omits an entire category of ecosystem and team risks that are probable given the project's small-team, greenfield, high-ambition posture. Dusk Studio has demonstrated a recurring pattern of Electron security vulnerabilities that Dusk must architect to avoid from day one. Fugoku ecosystem dependency is asymmetrical: Fugoku needs Dusk far less than Dusk needs Fugoku to succeed.

---

## 1. Risk Register Completeness

### 1.1 What Is Captured

The register (master-plan.md §6; unified-roadmap.md §6) covers eight risks:

| # | Risk | Source |
|---|------|--------|
| R1 | AGPL contamination | Legal |
| R2 | Scope creep | Planning |
| R3 | Resource constraints | Planning |
| R4 | Brand confusion with Dusk | Marketing |
| R5 | Fugoku dependency fears | Ecosystem |
| R6 | Mobile delays | Roadmap |
| R7 | Provider API changes | Technical |
| R8 | Competitive saturation | Market |

The mobile-strategy.md register adds seven mobile-specific risks (streaming performance, schema drift, UX divergence, app store rejection, Dusk AGPL confusion, mobile scope creep, network reliability).

### 1.2 What Is Missing

The register is missing risks in the following categories:

**Technical Architecture (5 missing)**
- SQLite data corruption / migration failure with no recovery procedure
- Electron security architecture (nodeIntegration, contextIsolation, preload bridge) — Dusk's entire CVE history is in this category
- Agent context window exhaustion and multi-tool failure cascades
- Keychain / credential store platform differences (macOS Keychain vs Windows DPAPI vs Linux libsecret)
- IPC contract drift between main and renderer process as the codebase grows

**Team & Process (4 missing)**
- Key-person dependency: 11 specialist agents are abstractions; if the human team is 1–3 people, single points of failure exist
- Greenfield underestimation: 12–16 weeks for a full Electron + agent + workspace + provider system from zero is historically optimistic by 40–60%
- Agent-based development coordination failure: the specialist agent model assumes output quality; if outputs are incomplete or contradictory, integration cost compounds
- Onboarding gap: Phase 1 assumes the team already knows the codebase; there is no plan for onboarding new contributors post-launch

**Legal & Compliance (4 missing)**
- GDPR Article 32 — security of processing: "local-first" does not eliminate GDPR obligations if any sync/cloud feature exists; a data breach notification procedure is absent
- Export control / sanctions: if Dusk ships globally, provider APIs may be restricted by jurisdiction; no mechanism to enforce geographic routing
- Trademark opposition: "Dusk" is a common word; prior art registrations likely exist in software categories
- AI-generated content liability: no watermarking, provenance tracking, or disclosure mechanism for agent-produced artifacts

**Competitive & Market (4 missing)**
- Dusk Studio feature parity acceleration: Dusk has 50k stars, active development, and a mature codebase — they can ship desktop-to-desktop competitive responses quickly
- Direct platform competition: OpenAI (ChatGPT desktop), Anthropic (Claude app), Google (Gemini app), and Microsoft (Copilot) are all expanding desktop presence
- Pricing pressure from free tiers: Open WebUI, Ollama clients, and provider-native apps are free; converting users to paid requires defensible differentiation
- Switching cost erosion: if workspace data is local-only, users can migrate to a competitor instantly — no lock-in works both ways

**Fugoku Ecosystem (3 missing)**
- Fugoku Gateway availability risk: Phase 2 depends on a gateway that does not yet exist at the required capability level
- Fugoku strategic drift: Fugoku's core business is GPU infrastructure; Dusk is a product experiment — resource allocation could shift
- Fugoku brand association: if Fugoku has any regulatory, compliance, or reputational incidents, Dusk inherits association risk

**Operational & Financial (3 missing)**
- No monetization before launch runway: the register assumes independent revenue within 12 months with no pricing, no sales motion, and no enterprise pipeline
- Provider API cost volatility: if OpenAI/Anthropic pricing shifts, Dusk's value proposition (any provider, no lock-in) becomes a cost-pass-through problem
- Dependency audit gap: the tech stack includes ~20 dependencies; no ongoing SBOM or supply chain monitoring process is defined

**AI-Specific (3 missing)**
- MCP server supply chain risk: MCP servers are third-party code executing with tool access; a compromised MCP server is a workspace-wide security incident
- Agent hallucination in tool use: agents writing files, executing code, or modifying workspace state based on hallucinated instructions
- Model behavior drift: model updates from providers can change agent behavior without Dusk code changes

### 1.3 Register Quality Score

| Dimension | Assessment |
|-----------|-----------|
| Breadth | Partial — 8 of ~25 major risk categories addressed |
| Depth | Shallow — most entries are 1-line mitigations |
| Likelihood calibration | Unreliable — several assessments appear optimistic |
| Mitigation specificity | Low — few mitigations are actionable as written |
| Owner assignment | Partial — only unified-roadmap.md assigns owners |
| Review cadence | Absent — no process for periodic risk review |

---

## 2. Risk Likelihood and Impact Assessment

### 2.1 Assessment Table with Critique

| Risk | Stated L/I | Revised L/I | Rationale |
|------|-----------|------------|-----------|
| AGPL contamination | Medium / Critical | Low / Critical | Greenfield reduces likelihood; isolation controls are strong. Impact assessment is accurate. |
| Scope creep | High / High | High / High | Accurate. Greenfield + agent-leverage teams are prone to over-scoping. |
| Resource constraints | High / High | High / High | Accurate for a project this ambitious at this phase. |
| Brand confusion with Dusk | Medium / Medium | Medium / **High** | Underestimated. Dusk's brand awareness in the AI desktop space is first-mover scale. Differentiation requires sustained marketing investment, not just naming. |
| Fugoku dependency fears | Low / Medium | **Medium** / Medium | Underestimated. The "standalone-first" framing reduces immediate concern, but Phase 2 explicitly depends on Fugoku Gateway capability. Users will notice. |
| Mobile delays | Medium / Low | Medium / **Medium** | Underestimated. Mobile is a competitive necessity (competitors have mobile apps). Absence affects professional credibility and platform reviews. |
| Provider API changes | Medium / Medium | Medium / Medium | Accurate. Abstraction layer mitigates but does not eliminate. |
| Competitive saturation | High / Medium | **High** / **High** | Underestimated. Every major AI platform is expanding desktop presence. "Professional positioning" is not a durable moat without pricing and distribution. |
| Greenfield build underestimation | Not assessed | **High** / **High** | A 12–16 week Phase 1 for a production Electron app with agent runtime, workspace model, provider abstraction, and build pipeline is historically optimistic by 40–60%. |
| Electron security architecture | Not assessed | **High** / **Critical** | Dusk has published 3 CVEs in this category in 12 months. Dusk shares the same Electron attack surface. |
| SQLite data corruption | Not assessed | **Medium** / **High** | No backup, migration, or recovery procedure is documented. A single corrupted workspace DB is unrecoverable without a backup strategy. |
| No monetization path | Not assessed | **High** / **High** | The project has a 12-month revenue target and no pricing, packaging, or sales motion. |
| Key-person dependency | Not assessed | **Medium** / **High** | 11 specialist agents are role abstractions. If execution depends on 1–2 people, single points of failure are structural. |

### 2.2 Key Calibration Errors

1. **Competitive saturation impact downgraded to Medium**: A saturated market with well-funded competitors (OpenAI, Anthropic, Google, Microsoft) launching desktop clients is a high-impact scenario. "Professional positioning" is a positioning strategy, not a defensibility mechanism.

2. **Fugoku dependency likelihood downgraded to Low**: Phase 2 explicitly requires Fugoku Gateway. The dependency is real and directional — Dusk depends on Fugoku, not the reverse. This should be Medium likelihood.

3. **Mobile delays impact downgraded to Low**: In a professional software market, absence of a mobile app is a competitive disqualifier for a meaningful segment of users. Mobile delays affect market reach, not just feature completeness.

4. **Greenfield timeline not assessed**: The 12–16 week Phase 1 estimate has no buffer for agent-coordination overhead, integration surprises, or scope negotiation. A 20–24 week estimate with a 12-week aggressive target would be more realistic.

---

## 3. Mitigation Strategy Assessment

### 3.1 Existing Mitigations — Evaluation

| Risk | Current Mitigation | Evaluation |
|------|--------------------|-----------|
| AGPL contamination | "Greenfield build, legal audit, no Dusk code" | **Partially actionable.** "No Dusk code" is a policy, not a control. There is no CI enforcement, no automated license scan, no build-time exclusion of `reference/`. The legal audit is a one-time event with no ongoing monitoring. |
| Scope creep | "Strict phase gates, MVP discipline" | **Not actionable as written.** No phase gate criteria are defined. No MVP definition is documented. "MVP discipline" is a cultural expectation, not a process. |
| Resource constraints | "Phased delivery, agent leverage" | **Partially actionable.** Phased delivery is defined (Phase 1/2/3). Agent leverage is an operating model assumption, not a risk mitigation. No resource buffer or contingency planning exists. |
| Brand confusion | "Distinct naming, branding, positioning" | **Actionable but incomplete.** Naming and branding are defined. Positioning is described but not measured. No trademark filing timeline, no brand monitoring process, no competitive response plan. |
| Fugoku dependency fears | "Standalone-first messaging" | **Insufficient.** Messaging is a marketing response to a structural dependency. Phase 2 cannot be delivered without Fugoku Gateway capability. No contractual or architectural fallback exists. |
| Mobile delays | "Desktop-first, mobile later" | **Actionable as prioritization.** However, this is a schedule decision, not a risk mitigation. No mobile prototype timeline, no platform review contingency. |
| Provider API changes | "Abstraction layer, provider adapters" | **Actionable and well-designed.** The provider abstraction pattern in the architecture document is sound. Missing: API version tracking, provider deprecation monitoring, fallback chain configuration. |
| Competitive saturation | "Professional positioning, calm UX" | **Insufficient.** Positioning is necessary but not sufficient against well-funded competitors. No competitive monitoring process, no feature differentiation audit, no pricing defensibility analysis. |

### 3.2 Mitigation Quality Summary

- **Fully actionable:** Provider API changes (abstraction layer)
- **Partially actionable:** AGPL contamination (policy exists, enforcement missing); Resource constraints (phasing defined, contingency missing)
- **Not actionable as written:** Scope creep (no gate criteria); Fugoku dependency (no architectural fallback); Competitive saturation (no monitoring or response)
- **Missing entirely:** 17 of 25 risk categories have no documented mitigation

---

## 4. Missing Risks — Detailed Analysis

### 4.1 Technical Architecture Risks

**T1: SQLite Data Corruption and Recovery Failure**

The architecture uses better-sqlite3 for all local persistence. No backup strategy, no migration procedure, no corruption detection mechanism, and no recovery workflow is documented. SQLite is robust but not invulnerable — power loss during write, filesystem corruption, and migration errors are real failure modes. A corrupted workspace database means the user loses all conversations, files, and agent state for that workspace with no recovery path.

**Recommendation:** Add a workspace backup mechanism (periodic SQLite `.backup` command to a secondary file), document a corruption recovery procedure in the testing strategy, and add integrity checks (PRAGMA integrity_check) to the startup sequence.

**T2: Electron Security Architecture**

Dusk Studio has published three CVEs in 12 months, all rooted in the same pattern: Electron security misconfiguration (nodeIntegration enabled, contextIsolation disabled, preload bridge bypass, unsafe URL handling). Dusk uses the same Electron architecture. The current plans do not document Electron security decisions.

**Critical controls that must be in place from day one:**
- `contextIsolation: true` in all BrowserWindow configurations
- `nodeIntegration: false` in all renderer processes
- A preload script that exposes only a whitelisted IPC surface
- No `shell.openExternal` calls from renderer code — all external URL opening through validated IPC
- Protocol handler validation (custom URL schemes must validate input)
- No remote code execution via search provider content, MCP server responses, or artifact rendering

**Recommendation:** Create an Electron security checklist in the backend-architecture.md. Make Electron security a Phase 1 quality gate. Assign to Backend/Desktop Eng.

**T3: Agent Context Window Exhaustion and Tool Failure Cascades**

The Workspace Agent and Task Agent depend on LLM context windows. As conversations grow, agent tasks accumulate tool calls, and workspace memory expands, the context window will be exhausted. When this happens, the agent degrades silently — it may truncate context, lose instructions, or hallucinate tool outputs. There is no documented handling for context window limits, tool call failure recovery, or agent state reset.

**Recommendation:** Document context window management strategy in the agent-system.md. Define truncation policies, checkpoint/resume for long-running tasks, and failure recovery for tool call chains.

**T4: IPC Contract Drift**

The architecture defines IPC as the main-renderer contract. As 11 agents contribute code across weeks, IPC channel schemas will drift — input/output types will diverge, channel names will conflict, and renderer code will call non-existent handlers. The testing strategy documents Zod schema enforcement but does not address the process for evolving IPC contracts safely.

**Recommendation:** Define an IPC versioning policy. Require that new IPC channels go through a schema review gate (Architect). Enforce schema validation at the test level for all IPC handlers.

**T5: Credential Store Platform Divergence**

Provider API keys, Fugoku credentials, and agent secrets must be stored securely. Desktop platforms differ: macOS Keychain, Windows DPAPI, Linux libsecret. The legal framework mentions encrypted-at-rest storage but the backend architecture does not specify the platform credential store integration. Using a cross-platform library without platform-native backing (e.g., `keytar` or `electron-store` with encryption) leaves keys vulnerable.

**Recommendation:** Specify the credential storage library and platform integration in backend-architecture.md. Add credential store tests to the QA pipeline.

### 4.2 Team & Process Risks

**P1: Greenfield Build Underestimation**

A 12–16 week Phase 1 for a production-ready Electron desktop app with: workspace model, provider abstraction, chat interface, agent runtime, tool execution, artifact system, theme engine, build pipeline, code signing, and auto-update infrastructure is optimistic. Comparable greenfield Electron projects (Obsidian, Notion desktop) took 6–12 months to reach production quality from similar starting points. The 11-agent operating model adds coordination overhead that is not accounted for in the sprint plan.

**Recommendation:** Adopt a 20–24 week Phase 1 estimate with a 12-week aggressive target and a 24-week realistic target. Define a minimum shippable MVP that can be delivered at 12 weeks and a "complete" MVP at 24 weeks.

**P2: Agent-Based Development Coordination Failure**

The project assumes 11 specialist agents produce implementable outputs that integrate cleanly. This assumes: (a) agent outputs are complete and internally consistent, (b) cross-agent handoffs work without rework, (c) the Architect can review and integrate all outputs. If any of these fail, the integration cost compounds. There is no documented integration sprint, no integration test plan that spans agent outputs, and no Architect review checkpoint before implementation begins.

**Recommendation:** Define an integration sprint (Sprint 0.5) between planning completion and implementation start. Require cross-agent output review by the Architect before any implementation agent begins work.

**P3: Key-Person Dependency**

If the project team is small (1–3 people), the 11 specialist agent roles are distributed across those people. If one person leaves or becomes unavailable, their agent roles have no backup. The master plan does not document role assignment, coverage, or knowledge transfer.

**Recommendation:** Document which human fills each specialist agent role. For Phase 1, identify the minimum viable team (Architect, Backend Eng, Frontend Eng, QA Eng) and ensure each role has a secondary. Document handoff procedures.

### 4.3 Legal & Compliance Risks

**L1: GDPR Scope Creep**

The legal framework correctly identifies GDPR obligations. However, the local-first architecture is not a GDPR exemption — if any user data touches Fugoku servers (even for Gateway routing, even with consent), Dusk becomes a data processor and must comply with GDPR Article 28 (processor agreement). The current framework does not document the Fugoku data processing agreement.

**Recommendation:** Draft a data processing agreement template for Fugoku before Phase 2 begins. Ensure the privacy policy clearly distinguishes Dusk-as-controller from Dusk-as-processor.

**L2: Export Control and Jurisdictional Restrictions**

The master plan acknowledges export controls but has no mechanism to enforce geographic routing. If a user in a sanctioned jurisdiction configures a provider API key that routes to a non-compliant endpoint, Dusk has no technical control. This is a compliance risk for Fugoku as the operating entity.

**Recommendation:** Define a provider routing policy that respects export controls. Consider geo-IP detection at the provider adapter level for jurisdictions with known restrictions.

**L3: AI Disclosure and Labeling**

The EU AI Act and emerging US regulations require disclosure of AI-generated content in certain contexts. Dusk's agent system produces artifacts, writes files, and executes tasks. There is no mechanism to label agent-generated content, no provenance tracking, and no user-facing disclosure. This will become a compliance issue when Dusk reaches users in regulated markets.

**Recommendation:** Add AI provenance metadata to agent artifacts (who generated it, when, which model, which agent). Add a disclosure toggle in settings for professional use cases that require attribution.

### 4.4 Competitive Risks

**C1: Dusk Studio Feature Parity Acceleration**

Dusk Studio has 50k GitHub stars, active development, and a mature Electron codebase. They have already implemented: multi-provider chat, agent system, MCP integration, file workspace, code highlighting, streaming, mobile app, and 300+ assistant templates. Dusk's Phase 1 feature set is a subset of what Dusk already ships. Dusk's team can respond to Dusk's positioning with a feature release in weeks, not months.

**Critical differentiators Dusk must establish before Dusk can copy them:**
- Professional workspace model (Dusk is chat-centric)
- Local-first data architecture (Dusk uses cloud features)
- Agent artifact system (Dusk's assistants produce chat output, not workspace files)
- Western brand positioning and clean IP (Dusk's Chinese origin is a differentiator in enterprise markets)

**Recommendation:** Accelerate workspace artifact and agent deliverable features. These are the hardest features for Dusk to replicate because they require architectural changes, not UI updates.

**C2: Platform-Builder Competition**

OpenAI (ChatGPT desktop app), Anthropic (Claude desktop), Google (Gemini app), and Microsoft (Copilot in Windows) are all investing in desktop AI clients. Each has brand recognition, distribution, and resources that dwarf Dusk's launch capacity. These platforms are moving toward "work OS" positioning — ChatGPT's GPTs, Claude's projects, and Copilot's agent features are early-stage work environments.

**Recommendation:** Dusk's value proposition must shift from "another AI client" to "the professional's AI work environment." This requires: (a) workspace persistence as a first-class feature, not an afterthought; (b) artifact production that integrates with professional workflows; (c) provider flexibility that platform clients cannot match. These features must ship in Phase 1, not Phase 3.

### 4.5 Fugoku Ecosystem Risks

**F1: Fugoku Gateway Availability Gap**

Phase 2 depends on Fugoku Gateway providing: unified LLM routing, fallback, cost caps, unified billing, and a Dusk provider preset. Fugoku's public materials describe GPU infrastructure and private cloud. The Gateway product is referenced in Dusk's architecture but its development status, capability level, and delivery timeline are not documented in any Dusk file reviewed.

**If Fugoku Gateway is not ready when Phase 2 begins, Dusk cannot deliver the Fugoku on-ramp feature set.** This is a hard dependency with no fallback.

**Recommendation:** Obtain a Fugoku Gateway capability commitment with a delivery timeline before Phase 1 completes. Define a Phase 2 fallback that delivers advanced agent features without Gateway (e.g., direct provider routing with local cost tracking).

**F2: Fugoku Strategic Drift**

Fugoku's core business is GPU infrastructure and private cloud. Dusk is a product experiment. Fugoku's resource allocation, leadership attention, and long-term commitment to Dusk are not guaranteed. If Fugoku pivots, reduces investment, or is acquired, Dusk's ecosystem advantage disappears.

**Recommendation:** Structure Dusk's standalone architecture so it can survive independently of Fugoku investment. The standalone-first model is the correct hedge — ensure it is technically and organizationally real, not just messaging.

**F3: Fugoku Brand Association**

If Fugoku experiences a security incident, regulatory action, or reputational event, Dusk inherits association risk by name and ecosystem linkage. This is particularly acute in enterprise sales, where a buyer will research both Fugoku and Dusk.

**Recommendation:** Ensure Dusk has independent brand strength (domain, trademark, launch presence) so it can survive a Fugoku association event. Do not rely on Fugoku's brand for Dusk's credibility.

### 4.6 AI-Specific Risks

**A1: MCP Server Supply Chain**

The mobile-strategy.md notes that MCP tool management is desktop-only in Phase 2. This is the correct scoping decision — MCP servers execute code with the agent's permissions. A malicious or compromised MCP server can: read workspace files, write arbitrary artifacts, execute shell commands (Dusk's CVE-2025-54074 proved this), exfiltrate data, and modify agent state.

**Current controls:** None documented beyond scoping MCP to desktop.

**Required controls:**
- MCP server trust model: users explicitly approve each server
- Tool permission granularity: each tool call requires user approval for sensitive operations (file write, shell execution)
- MCP server sandboxing: server code runs in a constrained environment, not with full agent permissions
- Audit log: all MCP tool calls are logged with server identity, tool name, arguments, and result

**Recommendation:** Document the MCP trust model in agent-system.md. Make MCP server approval a Phase 1 quality gate. Implement audit logging from the first MCP integration.

**A2: Agent Hallucination in Tool Use**

When agents execute tools (file read/write, shell commands, API calls), they generate the tool arguments from model output. Model hallucination can produce: wrong file paths (reading sensitive files), incorrect shell commands, malformed API requests that cause side effects, or file content that overwrites existing artifacts.

**Required controls:**
- Tool argument validation: all tool arguments validated against schemas before execution
- Sensitive path blocking: agents cannot read/write outside the workspace directory
- Confirmation gate for destructive operations: file write, shell execution, and API mutation require user confirmation
- Tool result verification: agents verify tool results before proceeding

**Recommendation:** Add tool permission enforcement and argument validation to the agent-system.md design. Make tool safety a Phase 1 implementation requirement, not a Phase 2 enhancement.

---

## 5. Dusk Studio Risks — What Dusk Faces That Dusk Also Faces

Dusk Studio's published CVEs and issues reveal a pattern of Electron security failures that Dusk shares by architectural choice. Dusk can avoid these by learning from Dusk's mistakes:

### 5.1 Dusk's Published CVEs

| CVE | Year | Vulnerability | Root Cause | Dusk Relevance |
|-----|------|--------------|------------|----------------|
| CVE-2026-40501 | 2026 | RCE via SearchService | nodeIntegration enabled, contextIsolation disabled | **Directly applicable.** Dusk uses Electron with web search/provider features. Must enforce contextIsolation from day one. |
| CVE-2025-54063 | 2025 | One-click RCE via custom URL handler | Unsafe custom protocol handler accepting arbitrary URLs | **Directly applicable.** Dusk will implement custom URL handlers for deep linking. Must validate all protocol inputs. |
| CVE-2025-54074 | 2025 | OS command injection via malicious MCP server | MCP client passes unsanitized server metadata to `open` function | **Directly applicable.** Dusk's MCP integration must sanitize all server-provided URLs before passing to OS-level functions. |

### 5.2 Dusk's Published Security Issues

**Issue #14232 — MCP Skill Auto-Install Without User Confirmation**

Dusk's MCP implementation auto-approves the `install` action for all agents, which fetches remote code and writes it to the filesystem without user confirmation. This is a privilege escalation vulnerability — any MCP server can write code that executes in the user's environment.

**Dusk implication:** Dusk's MCP integration must not auto-approve install or write actions. All filesystem operations via MCP must require explicit user confirmation.

**Issue #13966 — Preload Bridge Bypass**

Dusk's preload script exposes `shell.openExternal` directly to the renderer without URL validation, bypassing main-process security checks. Renderer code can open arbitrary URLs with full OS privileges.

**Dusk implication:** Dusk must not expose shell or OS-level functions through the preload bridge. All external operations must go through validated IPC channels with explicit allowlists.

### 5.3 Dusk's Risk Profile That Dusk Also Faces

Dusk faces risks that Dusk, as a structurally similar product, will also encounter:

1. **Electron security debt accumulates over time.** Dusk's CVEs appeared after the product was mature. Dusk must build security into the architecture before the first release, not retrofit it after CVEs are published.

2. **MCP trust model is unsolved.** Dusk's MCP implementation is a recurring source of vulnerabilities. Dusk's MCP integration will face the same trust boundary challenges. The MCP protocol standard is new (Anthropic, Nov 2024) and security patterns are still evolving.

3. **Feature breadth creates attack surface.** Dusk's 300+ assistant templates, MCP integrations, search providers, and file handlers each create potential attack surfaces. Dusk's scope is smaller at launch but will grow. Security must scale with feature growth.

4. **User-generated content and artifacts are XSS vectors.** Dusk renders markdown, code blocks, and HTML artifacts from agent output. Dusk will do the same. Unsanitized HTML in artifacts can execute JavaScript in the renderer. DOMPurify is in the dependency list but must be enforced at every rendering boundary.

---

## 6. Fugoku Ecosystem Risks

### 6.1 Dependency Direction Analysis

The Fugoku ecosystem creates an asymmetrical dependency:

```
Fugoku Infrastructure ──────► Fugoku Gateway ──────► Dusk
        │                         │                    │
   Fugoku's core            Phase 2 dependency    Phase 1 standalone
   business (GPU)           (does not yet exist)   (no dependency)
        │                         │                    │
   Fugoku's brand             Fugoku's product      Dusk's value prop
   and reputation             roadmap               includes Fugoku on-ramp
```

**Key asymmetry:** Fugoku can succeed without Dusk. Fugoku's GPU infrastructure business has existing customers and revenue. Dusk cannot deliver its Phase 2 value proposition without Fugoku Gateway. The dependency is real and directional.

### 6.2 Specific Fugoku Ecosystem Risks

**FE1: Gateway Capability Gap**

Fugoku Gateway is described as providing unified LLM routing, fallback, and billing. This is a non-trivial system that requires: provider API integrations, token counting, cost tracking, routing logic, failover mechanisms, and a Dusk-facing API. If Gateway is not ready when Phase 2 begins, Dusk's roadmap stalls.

**Impact:** High — Phase 2 cannot be delivered.  
**Likelihood:** Medium — no Gateway capability commitment is documented.  
**Mitigation:** Define a Phase 2 fallback that delivers Task Agent and Orchestrator without Gateway. Use direct provider routing with local cost tracking as the Phase 2 baseline.

**FE2: Brand Contamination**

If Fugoku experiences a security incident, regulatory action, or reputational event (e.g., GPU hardware supply chain issue, data center outage, sanctions violation), Dusk inherits brand association. In enterprise sales, a buyer researching Dusk will find Fugoku as the parent entity. Fugoku's brand is currently infrastructure-focused, not product-focused — this is a risk for Dusk's professional positioning.

**Impact:** Medium — affects enterprise sales and user trust.  
**Likelihood:** Low — Fugoku appears well-established, but no risk assessment of Fugoku's own risk profile is available.  
**Mitigation:** Dusk should establish independent brand presence (domain, trademark, press) before Phase 2 launch. Ensure Dusk's legal entity can operate independently if the Fugoku association becomes a liability.

**FE3: Resource Allocation Instability**

Fugoku's investment in Dusk is discretionary. If Fugoku's GPU business requires additional capital or faces market pressure, Dusk's funding, engineering resources, and strategic priority could be reduced. There is no documented commitment from Fugoku to Dusk's roadmap or timeline.

**Impact:** High — could halt Phase 2 or Phase 3 development.  
**Likelihood:** Low in the near term, Medium over a 24-month horizon.  
**Mitigation:** Structure Dusk's standalone architecture so it can operate as an independent product. The standalone-first model is the correct hedge — ensure it is real, not rhetorical. Consider Dusk's commercial licensing structure so it can generate revenue independently of Fugoku services.

**FE4: Gateway Lock-in Risk**

If Dusk's Phase 2 features are designed specifically for Fugoku Gateway (routing UI, usage dashboard, cost caps), and Fugoku Gateway proves inadequate or expensive, Dusk cannot easily switch to a different gateway provider without re-architecting Phase 2 features.

**Impact:** Medium — limits Dusk's provider flexibility.  
**Likelihood:** Medium — gateway evaluation is not documented.  
**Mitigation:** Design the Fugoku integration as a provider adapter (like OpenAI, Anthropic) rather than a core architectural dependency. The Gateway preset should be one option among many, not the only routing mechanism.

---

## 7. Priority Mitigations — Immediate Actions

The following mitigations must be addressed before implementation begins. They are ranked by urgency and impact.

### P0 — Block Implementation (Must Complete Before Any Code Ships)

**P0-1: Electron Security Architecture Lock**

- Define and document Electron security configuration: contextIsolation=true, nodeIntegration=false, preload bridge surface area, IPC channel allowlist, URL validation for all external-facing handlers
- Assign to: Backend/Desktop Eng
- Gate: No Electron scaffold begins until security architecture is documented and reviewed

**P0-2: AGPL Boundary Enforcement Automation**

- Add CI check that fails if any AGPL/GPL/LGPL dependency is added (extend `license-checker`)
- Add build-time exclusion of `reference/` directory from all release artifacts
- Document the boundary rules in a `CONTRIBUTING.md` section
- Assign to: Legal + DevOps/Release Eng
- Gate: No PR merged without passing AGPL boundary check

**P0-3: Phase 1 Scope Definition and MVP Gate Criteria**

- Define the minimum shippable feature set for a 12-week Phase 1
- Define the "complete" MVP feature set for a 24-week Phase 1
- Document phase gate criteria: what must be true for Phase 1 to be considered complete
- Assign to: Architect + Marketing
- Gate: Sprint 1 begins only after MVP definition and phase gates are documented

**P0-4: Timeline Realism Adjustment**

- Revise Phase 1 estimate from 12–16 weeks to 20–24 weeks with a 12-week aggressive target
- Add 20% contingency buffer to all sprint estimates
- Document the difference between "minimum shippable" and "complete" Phase 1
- Assign to: Architect

### P1 — Complete in Sprint 1–2 (Before Feature Development)

**P1-1: Data Integrity and Recovery Strategy**

- Document workspace backup mechanism (SQLite `.backup` on a schedule)
- Add `PRAGMA integrity_check` to startup sequence
- Define workspace migration procedure for schema changes
- Assign to: Backend/Desktop Eng

**P1-2: IPC Contract Governance**

- Define IPC versioning policy
- Require Architect review for all new IPC channels
- Add IPC schema validation to the test pipeline
- Assign to: Architect

**P1-3: MCP Trust Model Documentation**

- Document MCP server approval flow (user must approve each server)
- Define tool permission granularity (read-only vs. read-write vs. admin per tool)
- Plan audit logging for all MCP tool calls
- Assign to: Agent System Eng

**P1-4: Credential Storage Specification**

- Specify platform-native credential store (keytar or equivalent)
- Document encryption requirements for stored API keys
- Define credential migration procedure (e.g., when user changes provider keys)
- Assign to: Backend/Desktop Eng

**P1-5: Fugoku Gateway Fallback Plan**

- Define Phase 2 features that can be delivered without Fugoku Gateway
- Establish Gateway capability checkpoint at Phase 1 completion
- Assign to: Architect + Marketing

### P2 — Complete Before Phase 1 Ship

**P2-1: Competitive Monitoring Process**

- Define a monthly competitive review cadence
- Track: Dusk Studio releases, platform client updates (OpenAI, Anthropic, Google), pricing changes, feature additions
- Assign to: Marketing/Growth

**P2-2: Monetization Design**

- Define pricing tiers (free / pro / team / enterprise)
- Define Fugoku Gateway billing integration requirements
- Document commercial licensing terms
- Assign to: Marketing + Legal

**P2-3: Team Role Assignment and Coverage**

- Document which human fills each specialist agent role
- Define backup/secondary for each Phase 1 role
- Document handoff procedures
- Assign to: Architect

**P2-4: GDPR Data Processing Agreement**

- Draft Fugoku data processing agreement template
- Define Dusk-as-controller vs. Dusk-as-processor boundaries
- Assign to: Legal

**P2-5: Agent Tool Safety Design**

- Document tool permission enforcement strategy
- Define confirmation gates for destructive operations
- Plan tool argument validation at the execution layer
- Assign to: Agent System Eng

---

## 8. Risk Register Update Recommendations

The following table is a proposed replacement for the current register, incorporating the assessments above:

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Priority |
|----|------|-----------|--------|------------|-------|----------|
| R1 | AGPL contamination | Low | Critical | CI license scan, build exclusion of `reference/`, legal audit, CLA | Legal | P0 |
| R2 | Scope creep | High | High | MVP definition, phase gates, Architect gate on new features | Architect | P0 |
| R3 | Resource constraints | High | High | Phased delivery, 20% contingency buffer, role coverage plan | All | P1 |
| R4 | Brand confusion with Dusk | Medium | High | Distinct branding, trademark filing, competitive differentiation audit | Marketing | P1 |
| R5 | Fugoku Gateway availability | Medium | High | Phase 2 fallback plan, Gateway capability checkpoint | Architect | P1 |
| R6 | Mobile delays | Medium | Medium | Desktop-first priority, mobile prototype timeline, platform review contingency | Mobile Eng | P2 |
| R7 | Provider API changes | Medium | Medium | Abstraction layer, API version tracking, deprecation monitoring | Backend | P2 |
| R8 | Competitive saturation | High | High | Competitive monitoring, workspace artifact differentiation, pricing design | Marketing | P2 |
| R9 | Electron security vulnerabilities | High | Critical | Security architecture lock, contextIsolation, preload hardening, CI security scan | Backend | P0 |
| R10 | SQLite data corruption | Medium | High | Backup mechanism, integrity checks, migration procedure, recovery workflow | Backend | P1 |
| R11 | Greenfield build underestimation | High | High | Revised timeline (20–24 weeks), MVP scope definition, integration sprint | Architect | P0 |
| R12 | Agent tool hallucination | Medium | High | Argument validation, path blocking, confirmation gates, result verification | Agent Eng | P1 |
| R13 | MCP server supply chain | Medium | High | Server approval flow, permission granularity, audit logging, sandboxing | Agent Eng | P1 |
| R14 | No monetization path | High | High | Pricing design, sales motion, enterprise licensing terms | Marketing + Legal | P2 |
| R15 | Key-person dependency | Medium | High | Role assignment, backup coverage, handoff documentation | Architect | P1 |
| R16 | GDPR processor obligations | Medium | High | Data processing agreement, privacy policy update, breach notification procedure | Legal | P1 |
| R17 | Dusk feature parity acceleration | High | High | Workspace artifact differentiation, accelerated Phase 1 features, competitive monitoring | All | P1 |
| R18 | Platform builder competition | High | High | Workspace-first positioning, artifact production, provider flexibility as moat | Marketing | P2 |
| R19 | Agent context window exhaustion | Medium | Medium | Truncation policy, checkpoint/resume, state reset mechanism | Agent Eng | P2 |
| R20 | IPC contract drift | High | Medium | IPC versioning policy, Architect review gate, schema CI enforcement | Architect | P1 |
| R21 | Credential store divergence | Medium | High | Platform-native key store specification, encryption requirements | Backend | P1 |
| R22 | Fugoku brand association | Low | Medium | Independent brand presence, Dusk trademark filing, legal entity independence | Legal | P2 |
| R23 | AI content liability | Medium | High | Provenance tracking, disclosure mechanism, artifact metadata | Legal + Eng | P2 |
| R24 | Export control / sanctions | Low | High | Geographic routing policy, provider jurisdiction enforcement | Legal + Backend | P2 |
| R25 | ContextIsolation/preload bypass | High | Critical | Preload bridge audit, IPC-only external operations, type-level URL constraints | Backend | P0 |

---

## 9. Summary of Critical Findings

**The risk register as written is insufficient for a greenfield project of this scope.** It captures the headline risks but misses the technical, team, legal, and ecosystem risks that are most likely to determine Phase 1 success or failure.

**Three risks are existential for Phase 1:**

1. **Electron security architecture** (R9, R25) — Dusk has proven that Electron security failures are common and severe. Dusk must architect security in from the first line of code, not retrofit it after the first CVE.

2. **Greenfield timeline realism** (R11) — A 12–16 week Phase 1 estimate for this scope is historically optimistic. If the team commits to this timeline without contingency, Phase 1 will either ship broken or slip significantly.

3. **AGPL boundary enforcement** (R1) — The policy ("no Dusk code") is sound but has no enforcement mechanism. One accidental import of Dusk code into the build invalidates the entire legal strategy. This must be automated, not trusted.

**The three risks most likely to be underestimated:**

1. **Competitive saturation** (R8) — The market is not "competitive." It is dominated by well-funded, fast-moving incumbents who can replicate Dusk's features in weeks. Professional positioning is necessary but not sufficient.

2. **Fugoku Gateway dependency** (R5, FE1) — Phase 2 cannot be delivered without a Gateway that does not yet exist. This is a single point of failure with no fallback.

3. **Agent-based development coordination** (P2) — The 11-agent operating model is untested at this scale. If agent outputs are incomplete, contradictory, or require significant rework, the coordination cost will consume the Phase 1 timeline buffer.

**The three mitigations that would have the highest impact if implemented today:**

1. Define the Phase 1 MVP scope and phase gate criteria — without this, scope creep is guaranteed
2. Document the Electron security architecture — without this, the first security review will find critical issues
3. Revise the Phase 1 timeline to 20–24 weeks — without this, the team is planning for a timeline that is unlikely to be achieved

---

*This review is a living document. Risk assessments should be revisited at the end of each sprint and before each phase transition. The risk register should be a project management artifact, not a planning artifact — it must be reviewed, updated, and acted on continuously.*
