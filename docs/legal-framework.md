# Dusk — Legal & IP Framework

**Status:** Active  
**Owner:** Legal/IP Counsel  
**Last updated:** 2026-08-11  
**Scope:** Dusk Work OS (commercial product, Fugoku ecosystem)  

---

## 1. AGPL Contamination Risk Assessment

### 1.1 Current Risk Level: **LOW — GREENFIELD**

Dusk is being built **greenfield** (from scratch) with Cherry Studio repos cloned in `reference/` for **design and architecture reference only**. No Cherry Studio code is being copied, modified, or distributed as part of Dusk.

**Current state is clean.** The `reference/` repos remain isolated reference copies and are not part of the Dusk distribution.

### 1.2 What Would Trigger AGPL Obligations

AGPL-3.0 (Affero General Public License) is a **strong copyleft** license. Obligations are triggered when:

1. **AGPL-covered source code is modified** and the modified version is **distributed** to users outside the organization.
2. The **modified work is run over a network** (SaaS / hosted variant) — AGPL §13 requires source publication to all users who interact with it over a computer network.
3. **AGPL code is combined** with proprietary code in a way that creates a single "combined work" under copyright law (contested area, but risky for a commercial product).

**Specific triggers for Dusk if Cherry code were imported:**
- Shipping Dusk desktop client (Electron app) to users = distribution → AGPL source publication required.
- Running Dusk as a hosted service (even internal tools accessed by users) = network interaction → AGPL source publication required.
- Linking Cherry libraries into Dusk binaries = creating a combined work → entire combined work subject to AGPL.

### 1.3 Safe Boundaries for Using Cherry as Reference

The following activities are **safe** and do **not** trigger AGPL:

| Activity | AGPL Risk | Notes |
|---|---|---|
| Cloning Cherry repos for personal/internal review | None | No distribution |
| Reading Cherry architecture, data models, IPC patterns | None | Ideas are not copyrightable |
| Studying Cherry's provider abstraction, agent system design | None | Functional concepts are not protected |
| Reimplementing Cherry patterns from scratch in Dusk | None | Independent implementation |
| Discussing Cherry design decisions in Dusk docs | None | Expression of ideas |
| Keeping Cherry in `reference/` directory in Dusk repo | None (if not distributed) | Ensure `reference/` is excluded from Dusk release packages and binary distributions |

**Critical boundary:** The `reference/` directory containing Cherry source code must **never be included** in:
- Dusk release builds (`.dmg`, `.exe`, `.AppImage`, etc.)
- Dusk npm/pnpm packages published to registries
- Docker images or other deployment artifacts
- Git tags/releases of the Dusk repository (add to `.gitignore` for release tooling)

### 1.4 Code Patterns to Avoid (Derivative Works)

Do **not** do the following when working with Cherry reference code:

| Pattern | Risk | Safe Alternative |
|---|---|---|
| Copy-pasting Cherry source files into `src/` | **HIGH** — clear derivative work | Write fresh implementation; use Cherry only as a spec |
| Modifying Cherry files and committing them to Dusk | **HIGH** — modified AGPL work | Never commit Cherry files to Dusk; keep them only in `reference/` |
| Importing Cherry packages (`@cherrystudio/*`) into Dusk | **HIGH** — creates combined work | Implement equivalent functionality independently |
| Adapting Cherry's IPC schemas verbatim | **MEDIUM-HIGH** — expression of architecture | Re design the IPC layer independently; study patterns only |
| Reusing Cherry's database schema designs exactly | **MEDIUM** — functional but risky if identical | Design Dusk's own schema; Cherry's data model can inspire structure but not be copied |
| Including Cherry's test fixtures, mocks, or snapshots | **MEDIUM** — uncopyrightable but blurs lines | Write Dusk-specific tests and fixtures |
| Cherry branding, icons, assets in Dusk | **LOW-IP / HIGH-BRAND** — trademark issue | Full rebrand (Dusk identity, palette, naming) |

**Key test for safe use:** "Could a reasonable developer look at Dusk code and say it was independently written without reference to Cherry?" If yes, you're safe. If the answer depends on seeing Cherry source, you're in derivative-work territory.

---

## 2. Dusk License Recommendation

### 2.1 License Options for Commercial Software

| License | Commercial Use | Copyleft | Source Publication Required | Complexity | Recommendation |
|---|---|---|---|---|---|
| **MIT** | ✅ | No | No | Low | ✅ **Primary choice** |
| Apache 2.0 | ✅ | No | No | Low | Good alternative |
| BSD 3-Clause | ✅ | No | No | Low | Acceptable |
| GPL v3 | ✅ (but viral) | Yes | Yes (on distribution) | Medium | ❌ Avoid for commercial |
| AGPL v3 | ⚠️ | Yes | Yes (on network use) | High | ❌ Explicitly avoid |
| Proprietary / EULA only | ✅ | N/A | N/A | High | Option for enterprise tier |

### 2.2 Recommended License: **MIT License**

**Rationale:**
1. **Maximum commercial freedom** — MIT imposes no copyleft obligations. Dusk can be sold, sublicensed, and incorporated into proprietary products without source publication.
2. **Broad ecosystem compatibility** — MIT is compatible with virtually all open-source licenses, minimizing friction for contributors and downstream users.
3. **Low barrier to entry** — Professionals and enterprises are familiar with MIT; no legal friction for adoption.
4. **Clean separation from Fugoku** — MIT-licensed Dusk can integrate with Fugoku's proprietary services (Gateway, Cloud) without AGPL contamination concerns.
5. **Future flexibility** — If Dusk later wants to offer a proprietary "Enterprise Edition" with additional features, MIT allows dual-licensing or proprietary extensions alongside the open core.

**License text** to be placed at `LICENSE` in repo root:

```
MIT License

Copyright (c) 2026 Fugoku

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 2.3 Contributor License Agreement (CLA)

**Recommendation:** Require a CLA for all external contributors.

**Why:** A CLA ensures that Fugoku holds broad rights to contributor code (relicensing, commercial use, enforcement) without needing individual contributor consent for future licensing changes. This is standard practice for commercial open-core projects.

**CLA terms should include:**
1. Contributor grants Fugoku a broad, perpetual, irrevocable license to use, reproduce, modify, distribute, and sublicense the contributed code.
2. Contributor warrants that the contribution is their original work or they have rights to contribute it.
3. Fugoku agrees to release contributed code under Dusk's MIT license (or compatible license).
4. CLA does not require assignment of copyright (unlike some CLAs); contributor retains copyright while granting broad license.

**Implementation:** Use [CLA Assistant](https://cla-assistant.io/) or [EasyCLA](https://linuxfoundation.org/resources/easycla/) with a pull-request-gated workflow.

**Exception for internal contributors:** Fugoku employees contributing within their employment scope do not need a separate CLA (work-for-hire doctrine applies).

---

## 3. Third-Party License Obligations

### 3.1 Confirmed Dependencies (MIT License)

Based on Cherry Studio reference stack and planned Dusk tech stack:

| Dependency | License | Notes |
|---|---|---|
| Electron | MIT | See also Electron's additional terms for redistribution |
| React | MIT | |
| Vite | MIT | |
| better-sqlite3 | MIT | Native module; check platform-specific redistribution terms |
| TailwindCSS | MIT | |
| shadcn/ui | MIT | Components are MIT; generated files inherit MIT |
| Framer Motion (motion) | MIT | |
| TypeScript | Apache 2.0 | |
| Vitest | MIT | |
| React Router | MIT | |
| Dexie | MIT | |
| Zod | MIT | |
| SWR | MIT | |
| React Hook Form | MIT | |
| Radix UI | MIT | |
| Lucide React | ISC | Compatible with MIT distribution |
| Day.js | MIT | |
| UUID | MIT | |
| DOMPurify | MIT | |
| es-toolkit | MIT | |
| p-queue | MIT | |

### 3.2 Additional License Categories to Track

When building Dusk greenfield, additional dependencies may introduce different licenses:

| License | Action Required | Examples to Watch |
|---|---|---|
| **MIT / Apache 2.0 / BSD** | None beyond attribution | Most JS ecosystem |
| **AGPL** | **Avoid entirely** | Do not add AGPL dependencies |
| **GPL / LGPL** | **Avoid** for desktop app distribution | LGPL for native libraries may be acceptable with dynamic linking, but risky |
| **SSPL** | **Avoid** (controversial, may not be OSI-approved) | MongoDB, some Redis variants |
| **BUSL / BSL** | **Avoid** (source-available, not open source) | Redis under new license, Terraform |

### 3.3 Aggregate License File Plan

Create a `THIRD_PARTY_LICENSES.md` at repo root containing:

1. **Attribution section** — copyright notices for each MIT/Apache/BSD dependency.
2. **License text section** — full license texts for all non-MIT dependencies (if any are added).
3. **Build-time generation** — automate via:
   - `license-checker` (npm) for JS dependencies
   - `cargo license` if Rust dependencies are added
   - Manual audit for native/npm modules with unusual licenses

**Automation:** Add a CI step that runs `npx license-checker --summary` and fails on AGPL/GPL dependencies.

---

## 4. Privacy Policy Framework

### 4.1 Data Collection

#### What Dusk Collects

| Data Category | What | Why | How |
|---|---|---|---|
| **Local workspace data** | Conversations, files, agent configurations, artifacts | Core product functionality | Stored locally on user's machine (SQLite); never transmitted unless user opts in |
| **Provider API keys** | OpenAI, Anthropic, Google, etc. API keys | To connect user's chosen models | Encrypted at rest in local credential store; never sent to Fugoku servers |
| **Usage telemetry (opt-in)** | Feature usage, crash reports, performance metrics | Product improvement | Sent only if user explicitly enables telemetry |
| **Account data (Fugoku connect, opt-in)** | Fugoku account identifier, billing info, sync preferences | Fugoku Gateway routing and Cloud sync | Collected only when user connects a Fugoku account |
| **Crash dumps (opt-in)** | Stack traces, local state snapshots | Debugging and stability | Sent only with explicit user consent |

#### What Dusk Does **NOT** Collect

- Workspace content without user action
- Conversation history without explicit sync opt-in
- Keystrokes or screen content
- Files stored in workspaces (stays local by default)
- Browsing history or system data beyond what Electron reports for stability

### 4.2 Local-First Data Model

Dusk's architecture is **local-first by default**:

1. **Default state:** All workspace data (conversations, files, agents, settings) stored in local SQLite database at user's application data directory.
2. **No account required:** Dusk functions fully without any account creation.
3. **No telemetry by default:** All reporting is opt-in.
4. **User owns their data:** Users can export, backup, or delete their workspace data at any time without vendor lock-in.

### 4.3 Optional Fugoku Cloud Sync Data Flows

When a user opts into Fugoku Cloud sync (future feature):

```
User's Dusk instance → Fugoku Cloud API (encrypted TLS)
    ├── Workspace metadata (names, structure, not content by default)
    ├── Encrypted workspace content (user-controlled encryption key)
    ├── Agent configurations (user-selected sync scope)
    └── Sync metadata (timestamps, versions, conflict resolution)
```

**Data flow commitments:**
- All sync traffic encrypted in transit (TLS 1.3).
- Workspace content optionally end-to-end encrypted by user key.
- Fugoku servers store sync data; users can delete sync data at any time.
- Sync is **opt-in per workspace** — users can have some workspaces synced and others purely local.
- No data sharing with third parties except as required by law.

### 4.4 User Rights

Dusk must provide users with:

| Right | Implementation |
|---|---|
| **Access** | Users can view all stored data via Dusk's data viewer or export |
| **Deletion** | Users can delete individual items or wipe all data; Fugoku Cloud sync deletion available from Dusk or Fugoku dashboard |
| **Export** | Full workspace export in open formats (JSON, Markdown, SQLite dump) |
| **Data portability** | Export format usable by other tools; no proprietary lock-in |
| **Consent management** | Granular toggles for telemetry, crash reporting, and sync |
| **Account deletion** | If Fugoku account connected, deletion flow from Dusk → Fugoku API |

### 4.5 GDPR / CCPA Compliance Checklist

**GDPR (EU Users):**

| Requirement | Status | Action |
|---|---|---|
| Lawful basis for processing | ✅ | Legitimate interest (core functionality) + consent (telemetry/sync) |
| Privacy notice | ⬜ | Create at `dusk.ai/privacy` or in-app |
| Data minimization | ✅ | Local-first; only sync opt-in data |
| Right to access | ⬜ | Implement export feature |
| Right to erasure | ⬜ | Implement workspace wipe + sync deletion |
| Right to portability | ⬜ | Implement JSON/SQLite export |
| Data protection by design | ✅ | Local-first architecture |
| DPO / EU representative | ⬜ | If EU user base grows significantly |
| Cookie consent | ✅ | Dusk desktop app; no web cookies in core product |

**CCPA / CPRA (California Users):**

| Requirement | Status | Action |
|---|---|---|
| Notice at collection | ⬜ | In-app notice for telemetry/sync |
| Right to know | ⬜ | Privacy policy listing data categories |
| Right to delete | ⬜ | Same as GDPR erasure |
| Right to opt-out of sale | ✅ | No data sale; no advertising model |
| Do not sell signal | ✅ | Not applicable |
| Service provider agreements | ⬜ | With Fugoku Cloud if using shared infrastructure |

**Cross-border data transfer:** If Fugoku Cloud infrastructure is in specific jurisdictions, disclose this in privacy policy.

---

## 5. Terms of Service Framework

### 5.1 Acceptable Use Policy

**Permitted uses:**
- Personal and internal business use of Dusk for AI-assisted work
- Development, testing, and evaluation of AI workflows
- Integration with supported model providers and MCP tools
- Fugoku ecosystem services when opted in

**Prohibited uses:**

| Category | Prohibited Activity |
|---|---|
| **Illegal activity** | Using Dusk to violate laws, regulations, or third-party rights |
| **Harmful content generation** | Generating CSAM, malware, phishing content, or other illegal material |
| **Abuse of providers** | Reverse-engineering provider APIs, scraping at scale, or violating provider terms |
| **Circumvention** | Tampering with Dusk licensing, telemetry opt-outs (if required for billing), or security controls |
| **Resale** | Reselling Dusk as-is without Fugoku authorization (if commercial license required) |
| **Misrepresentation** | Impersonating Fugoku or Dusk; using Dusk branding without permission |
| **Reverse engineering (MIT clause)** | While MIT allows reverse engineering, commercial terms may restrict it for licensing enforcement |

### 5.2 Service Descriptions

**Dusk Desktop (Core):**
- Local-first AI work environment
- Multi-provider chat, agent support, file workspace
- Available for macOS, Windows, Linux

**Dusk + Fugoku Gateway (Optional):**
- Unified LLM routing through Fugoku infrastructure
- Fallback, cost caps, unified billing across providers

**Fugoku Cloud Sync (Future):**
- Optional workspace synchronization across devices
- Team workspace support (enterprise tier)

**Service levels:**
- Dusk Desktop: No SLA (client software; availability depends on user's machine)
- Fugoku Gateway: SLA per Fugoku Gateway terms
- Fugoku Cloud: SLA per Fugoku Cloud terms

### 5.3 User Responsibilities

1. **Accountability for use:** Users are responsible for all activity under their account and for compliance with applicable laws.
2. **Provider terms:** Users must comply with third-party AI provider terms of service (OpenAI, Anthropic, etc.) when using Dusk with those providers.
3. **Data handling:** Users are responsible for data they process through Dusk; Dusk is a tool, not a data processor by default (local-first).
4. **Security:** Users must protect their API keys and account credentials; Dusk stores keys locally but users are responsible for machine security.
5. **Modifications:** Users may customize Dusk for internal use; redistribution of modified versions requires adherence to MIT license terms.

### 5.4 Limitation of Liability

**Standard MIT-based limitation:**

```
TO THE MAXIMUM EXTENT PERMITTED BY LAW, FUGOKU AND DUSK CONTRIBUTORS
SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF
PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES.

IN NO EVENT SHALL FUGOKU'S TOTAL LIABILITY TO USER FOR ALL CLAIMS ARISING
OUT OF OR RELATING TO DUSK EXCEED THE AMOUNT PAID BY USER TO FUGOKU FOR
DUSK IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.

SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY
FOR CONSEQUENTIAL OR INCIDENTAL DAMAGES, SO THE ABOVE LIMITATION MAY NOT
APPLY TO USER.
```

**Additional disclaimers:**
- Dusk is provided "as is" without warranty of any kind.
- Fugoku does not guarantee AI output accuracy, appropriateness, or fitness for purpose.
- Users are responsible for reviewing AI-generated content before acting on it.
- Fugoku is not liable for actions taken based on AI-generated suggestions.

### 5.5 Dispute Resolution

| Jurisdiction | Resolution Mechanism |
|---|---|
| **EU / UK** | Local courts have jurisdiction; consumers may have statutory rights that override these terms |
| **California** | Arbitration per AAA rules; class action waiver; consumers may have statutory rights |
| **Other jurisdictions** | Local courts of Fugoku's principal place of business; local consumer protection laws apply |
| **Enterprise customers** | Contractual terms in enterprise agreement supersede these terms |

**Governing law:** Delaware, USA (or appropriate jurisdiction for Fugoku entity).

---

## 6. Commercial Licensing Strategy

### 6.1 When to Offer Commercial License vs Open Source

**Open Source (MIT) for:**
- Core Dusk desktop application
- Community features, standard integrations
- Individual professionals, small teams, hobbyists

**Commercial License for:**
- Enterprise deployment with support agreements
- White-label or OEM embedding
- Custom feature development and priority support
- Large teams requiring SLAs, indemnification, or custom terms

**Fugoku integration (Gateway / Cloud):**
- Always commercial; billed through Fugoku ecosystem
- Dusk MIT code connects to Fugoku services via API (separate programs)

### 6.2 Enterprise Licensing Model Options

| Model | Target | Pricing Signal | Features |
|---|---|---|---|
| **Dusk Free** | Individuals, hobbyists | $0 | Core desktop, local-first, all providers |
| **Dusk Pro** | Professionals, power users | $X/month | Priority support, advanced agents, cloud sync |
| **Dusk Team** | Small teams (2-50) | $X/user/month | Shared workspaces, team admin, Fugoku Gateway bundle |
| **Dusk Enterprise** | Large orgs (50+) | Custom | SSO, audit logs, on-prem deployment, SLA, custom integrations |
| **Fugoku Gateway** | All tiers | Usage-based | Unified LLM routing, cost caps, billing |
| **Fugoku Cloud** | Enterprise+ | Usage-based | GPU compute, team sync, IAM |

### 6.3 Dual Licensing Considerations

**Current approach: Single MIT license** is recommended for launch.

**When to consider dual licensing:**
- If an enterprise customer requires a proprietary license with indemnification
- If a competitor embeds Dusk in a competing product
- If Fugoku wants to offer a "Fugoku-only" premium tier with exclusive features

**Dual licensing structure:**
- Open source: MIT (community edition)
- Commercial: Proprietary license for enterprise/embedded use
- Contributor code: Licensed to Fugoku broadly via CLA

**Note:** Dual licensing requires careful legal structuring to ensure the MIT version remains genuinely open and that the commercial license offers real additional value.

---

## 7. Brand & Trademark

### 7.1 "Dusk" Trademark Considerations

**Current status:** "Dusk" is not yet a registered trademark. Immediate actions:

1. **Common law trademark rights:** Start using "Dusk" as a brand in commerce (product releases, marketing, website) to establish common law rights in key markets (US, EU, etc.).
2. **Trademark registration:** File for trademark registration in:
   - United States (USPTO) — Class 9 (software), Class 42 (SaaS)
   - European Union (EUIPO) — Classes 9, 38, 42
   - Key markets: UK, Japan, China, Australia
3. **Trademark usage guidelines:** Define how "Dusk" can be used by the community and third parties.

**Brand usage rules:**
- "Dusk" should always appear with the ™ symbol until registered
- After registration: ® symbol
- "Dusk" refers specifically to Fugoku's product; do not allow genericization ("a dusk" or "dusks")
- App name: "Dusk" or "Dusk Work OS"
- Domain: `dusk.ai`, `dusk.work`, or similar

### 7.2 "Work OS" as Product Category

**"Work OS" is descriptive/generic** and cannot be trademarked as a category descriptor. However:

- "Dusk Work OS" as a full product name may have protectable elements
- Tagline: "The primary place for all your AI work" — protectable as distinctive branding
- Avoid using "Work OS" in isolation for trademark claims; use it descriptively

### 7.3 Logo Protection

1. **Create distinctive logo design** — avoid generic icons (briefcases, gears, etc.) that lack distinctiveness.
2. **Register logo** as a trademark (word mark + design mark).
3. **License logo usage:** Define when third parties can use Dusk logo (community sites, integrations, etc.) and when they need permission.
4. **Protect against dilution:** Monitor for confusingly similar logos or apps using "Dusk" name in AI/software space.

### 7.4 Cherry Brand Separation

**Critical:** Ensure no Cherry Studio branding, name, or visual identity appears in Dusk:
- No Cherry logos, icons, splash screens
- No "Cherry Studio" in Dusk documentation, UI, or marketing
- Clear differentiation in product positioning (Work OS vs. AI Studio)
- Cherry reference repos kept in `reference/` with explicit "not part of Dusk" labeling

---

## 8. Open Source Compliance Checklist

### 8.1 Pre-Launch Checklist

| Item | Owner | Status | Action |
|---|---|---|---|
| **Dusk license file** | Legal | ⬜ | Create `LICENSE` with MIT text |
| **Third-party licenses file** | Engineering | ⬜ | Create `THIRD_PARTY_LICENSES.md` with attribution |
| **Dependency license audit** | Engineering | ⬜ | Run `license-checker`; verify no AGPL/GPL deps |
| **Reference repo isolation** | Engineering | ⬜ | Confirm `reference/` excluded from build artifacts and releases |
| **Copyright headers** | Engineering | ⬜ | Add `Copyright (c) 2026 Fugoku` to new source files |
| **CLA workflow** | Legal + Engineering | ⬜ | Set up CLA Assistant; document in CONTRIBUTING.md |
| **Privacy policy** | Legal | ⬜ | Draft and publish at `dusk.ai/privacy` |
| **Terms of service** | Legal | ⬜ | Draft and publish at `dusk.ai/terms` |
| **Trademark filing** | Legal | ⬜ | File US and EU trademark applications for "Dusk" |
| **Brand guidelines** | Design + Legal | ⬜ | Document logo usage, color palette, brand voice |
| **Security policy** | Engineering | ⬜ | Create `SECURITY.md` with vulnerability disclosure process |
| **Contributing guide** | Engineering | ⬜ | Create `CONTRIBUTING.md` with CLA reference and guidelines |
| **Code of conduct** | Engineering | ⬜ | Adopt Contributor Covenant or similar |
| **GitHub settings** | Engineering | ⬜ | Configure branch protection, PR requirements, DCO signing |

### 8.2 Ongoing Compliance Monitoring

| Frequency | Activity | Tool/Method |
|---|---|---|
| **Every PR** | License check on new dependencies | CI: `license-checker` or `dotnet license` equivalent |
| **Every release** | Full dependency audit | Automated report + manual review |
| **Quarterly** | Third-party license review | Update `THIRD_PARTY_LICENSES.md` |
| **As needed** | Reference repo updates | Do not pull Cherry updates into Dusk; update `reference/` independently if needed |
| **Annually** | Trademark monitoring | Watch for conflicting "Dusk" registrations or apps |

### 8.3 Attribution Requirements

**In-product attribution:**
- Electron "About" dialog: "Powered by Electron, React, Vite, and other open-source libraries. See THIRD_PARTY_LICENSES.md for details."
- Settings → About section with license information

**In-repo attribution:**
- `THIRD_PARTY_LICENSES.md` at repo root
- Full license texts for any non-MIT dependencies
- Copyright notices preserved from original authors

**Distribution attribution:**
- Include `LICENSE` and `THIRD_PARTY_LICENSES.md` in all release packages
- Electron builder: configure `files` and `extraFiles` to include license files
- Installer metadata: include license agreement during installation

---

## Appendix A: Quick Reference — Do's and Don'ts

| Do | Don't |
|---|---|
| Read Cherry code in `reference/` for design ideas | Copy Cherry code into Dusk `src/` |
| Reimplement patterns from scratch | Import Cherry packages as dependencies |
| Keep `reference/` isolated from build | Ship `reference/` in release artifacts |
| Use MIT for Dusk core | Mix AGPL code into Dusk distribution |
| Require CLA from external contributors | Allow unlicensed external contributions |
| Document third-party licenses | Forget attribution in release packages |
| Build local-first by default | Send user data to servers without consent |

---

## Appendix B: Decision Log

| Decision | Choice | Date | Rationale |
|---|---|---|---|
| D1: Fork vs greenfield | Greenfield | 2026-08-10 | AGPL risk; clean IP for commercial product |
| D2: Dusk license | MIT | 2026-08-11 | Maximum commercial freedom; broad compatibility |
| D3: CLA requirement | Required for external contributors | 2026-08-11 | Protects relicensing and commercial use rights |
| D4: Cherry reference handling | Design reference only, isolated | 2026-08-10 | Zero AGPL contamination risk |
| D5: Privacy model | Local-first, opt-in sync | 2026-08-11 | User control; minimizes data obligations |
| D6: Commercial license from Cherry | Not pursued (unless budget allows) | 2026-08-10 | Greenfield path sufficient; Cherry commercial license is fallback |

---

*This document is the authoritative legal/IP reference for the Dusk project. All engineering, design, and business decisions should be checked against this framework. Update this document when decisions change.*
