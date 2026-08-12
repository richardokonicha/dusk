# Dusk — Build Plan

**Goal:** Ship Dusk as a standalone Work OS (desktop), with an optional Fugoku Gateway on-ramp.

**Current phase:** Phase 0 — Foundation (docs + decisions).

---

## Phases

### Phase 0 — Foundation ✅ (this week)
- [x] Lock name: **Dusk — Work OS**
- [x] Vision doc (`docs/vision.md`)
- [x] Standalone vs Fugoku capability matrix (`docs/standalone-vs-fugoku.md`)
- [x] Cherry diff (keep/customize/add) (`docs/cherry-diff.md`)
- [x] Scaffold folder + README
- [ ] **Decision: fork Cherry source vs greenfield-with-reference** (needs Cherry source review)
- [ ] Tech stack decision (Electron + ? — inherited from Cherry, or chosen fresh?)

### Phase 1 — Standalone MVP
Goal: a usable Dusk desktop client that works with any provider, no Fugoku.

- [ ] Workspace model (projects → chats/files/agents)
- [ ] Provider config (OpenAI-compatible + key providers)
- [ ] Agent/chat with tools + MCP
- [ ] Local file + artifact handling
- [ ] Branding (Dusk name, dusk palette)
- [ ] Build + package (mac/win/linux)

### Phase 2 — Fugoku on-ramp
- [ ] Fugoku Gateway provider preset (routes to `fugoku-ai-gateway`)
- [ ] Account-connect flow (Fugoku identity)
- [ ] Routing usage surfaced in Dusk

### Phase 3 — Fugoku Cloud (future)
- [ ] Provision compute instances from Dusk → `fugoku-cloud-api`
- [ ] Workspace sync via Fugoku Cloud
- [ ] Team workspaces via Fugoku IAM

---

## Open decisions (need your input)

1. **Build approach** — Fork Cherry Studio source as the base, or greenfield using Cherry as reference?
   - Fork = faster start, inherits battle-tested bits, but inherits its tech debt and license constraints.
   - Greenfield = cleaner, exactly the Work OS you want, but slower.
2. **Tech stack** — Inherit Cherry's stack (likely Electron + TS/React) or pick fresh?
3. **Launch scope** — Desktop-only at launch, or also a slim web version?
4. **Pricing/distribution** — Open source, paid, freemium? (Affects fork-vs-greenfield if Cherry's license has terms.)

---

## Risks

- **Name churn** — you've changed names several times (Odu, Dusk Work OS, Dusk AI Studio, Dusk). Locking **"Dusk"** now and branding decisions later avoids rework.
- **Scope creep** — Work OS + Cloud gateway + compute + sync is a lot. Phase 1 must be standalone MVP only.
- **Resource limits** — you're constrained. Favoring a fork (if license allows) gets to usable fastest.
