# Dusk — Build Plan

**Goal:** Ship Dusk as a standalone Work OS (desktop), with an optional Fugoku Gateway on-ramp.

**Current phase:** Phase 1 — Rebrand and package the Dusk desktop product.

---

## Phases

### Phase 0 — Foundation ✅ (this week)
- [x] Lock name: **Dusk — Work OS**
- [x] Vision doc (`docs/vision.md`)
- [x] Standalone vs Fugoku capability matrix (`docs/standalone-vs-fugoku.md`)
- [x] Dusk diff (keep/customize/add) (`docs/dusk-diff.md`)
- [x] Scaffold folder + README (historical reference)
- [x] **Decision: fork Dusk source vs greenfield-with-reference** → **FORK Dusk Studio as the Dusk base** (owner decision, 2026-09-05; supersedes greenfield D1)
- [x] Tech stack decision → inherited from Dusk: Electron + React + TS

### Phase 1 — Rebrand & Package (fork → Dusk)
Goal: Dusk Studio fork becomes a recognizable, shippable Dusk desktop client on mac/win/linux.

- [x] Vendor the product at `packages/dusk` (squashed subtree, upstream-syncable)
- [x] Rebrand: name, appId, icons, palette, and user-facing strings
- [x] Strip/neutralize inherited telemetry, update endpoints, and branded backend calls
- [x] Provider config works standalone (OpenAI-compatible + key providers) with no account dependency
- [x] Build the desktop product from the fork
- [x] Keep the greenfield scaffold as historical design reference; do not include it in the product workspace

### Phase 1.5 — Work OS layer (from `docs/dusk-diff.md` "Add" list)
- [ ] Workspace model on top of Dusk topics/assistants (projects → chats/files/agents)
- [ ] Files + artifacts as first-class workspace objects
- [ ] Agent task/job framing on Dusk's job queue
- [ ] Calm Work OS UX pass (first-run → workspace view, not empty chat)

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

1. ~~**Build approach**~~ — ✅ RESOLVED: **fork Dusk Studio** as the Dusk base (owner decision, 2026-09-05). License posture deferred per owner instruction — shipping focus.
2. ~~**Tech stack**~~ — ✅ RESOLVED: inherit Dusk's stack (Electron + React + TS).
3. **Launch scope** — Desktop-only at launch, or also a slim web version?
4. **Pricing/distribution** — Open source, paid, freemium? Decide after MVP.

---

## Risks

- **Name churn** — you've changed names several times (Odu, Dusk Work OS, Dusk AI Studio, Dusk). Locking **"Dusk"** now and branding decisions later avoids rework.
- **Scope creep** — Work OS + Cloud gateway + compute + sync is a lot. Phase 1 must be rebrand/package only; Work OS layer is Phase 1.5.
- **Upstream drift** — the fork must track Dusk upstream (`git subtree pull`) or we inherit a frozen, aging base. Budget recurring sync time.
- **Greenfield scaffold removed** — the `packages/desktop|renderer|shared` reference scaffold and the scaffold-targeted `e2e/` suite were deleted ahead of alpha; `packages/dusk` is the only product tree.
