# Dusk — Fork Strategy

**Status:** Active approach (owner decision, 2026-09-05). Supersedes the greenfield path in `BACKLOG/dusk-source-scout.md` for implementation; the scout doc stays as reference.
**Supersedes:** `docs/FINAL-RECOMMENDATION.md` build order (that assumed greenfield). Docs/vision/dusk-diff remain valid.

## The move

Dusk Studio (`github.com/DuskHQ/dusk-studio`, Electron + React + TS, 51k★) is vendored at `packages/dusk` as a **squashed git subtree**. It becomes the Dusk desktop client through three passes: **rebrand → strip → reshape**.

## Repo layout

```
DUSK/
├── packages/
│   ├── dusk/          ← the fork base (subtree, upstream-syncable) ← ACTIVE CODEBASE
│   ├── desktop/         ← greenfield scaffold (REFERENCE ONLY — do not extend)
│   ├── renderer/        ← greenfield scaffold (REFERENCE ONLY)
│   └── shared/          ← greenfield scaffold (REFERENCE ONLY)
├── docs/                ← Dusk product/design docs (all still valid)
└── BACKLOG/
```

## Upstream sync

```bash
git fetch dusk-upstream main:dusk-upstream-main
git subtree pull --prefix packages/dusk dusk-upstream-main --squash \
  -m "chore: sync Dusk upstream"
```
Cadence: sync after each Dusk minor release; review their changelog for provider-protocol changes first. Subtree conflicts land in `packages/dusk` only — resolve there, never by editing around them elsewhere.

## Workstreams

### WS1 — Rebrand (user-visible identity)
- App name `Dusk`, product name, appId/bundle IDs, window titles
- Icons/logos → Dusk assets (all platforms + tray)
- Theme: dusk/twilight palette replaces Dusk palette (greenfield `packages/renderer` design tokens are the reference)
- All user-facing strings: "Dusk Studio" → "Dusk", incl. i18n files (en first; prune non-English locales later if unmaintained)
- Dusk URLs (dusk-ai.com, docs, repo links) → Dusk/Fugoku equivalents or removed
- About page: credits Dusk Studio upstream (keep copyrights), Dusk branding

### WS2 — Strip (Dusk service dependencies)
- Telemetry/analytics (identify and no-op)
- Auto-update endpoints → point at Dusk releases or disable
- Dusk account/cloud features (sync, webdav defaults, referral links)
- Dusk-branded provider presets that phone home
- Verify: app is fully functional offline except user-configured providers

### WS3 — Packaging
- `package.json` / electron-builder: name, productName, appId, protocols
- CI: build matrix mac/win/linux off Dusk repo; artifacts signed as Dusk
- First-run: works with any OpenAI-compatible endpoint, no Dusk account gate

### WS4 — Reshape into Work OS (Phase 1.5, after WS1–3 ship)
Per `docs/dusk-diff.md` "Add" list, building on Dusk's topic/session + job queue:
- Workspaces as containers over topics/assistants/files
- Files + artifacts as first-class workspace objects (see greenfield Drizzle schema for the data-model sketch)
- Agent tasks with lifecycle visibility (queue → done) — Dusk already has a job queue + scheduler
- First-run lands on workspace view, calm-work copy throughout
- Fugoku Gateway as an optional provider preset (HTTP boundary, standalone still default)

## Guardrails

1. **One codebase of truth:** all new work lands in `packages/dusk`. The greenfield packages are a design library — port ideas, don't grow them.
1b. **No China-market carryover** (repo rule, `AGENTS.md`): CN edition, CN mirrors, CN-first routing, CN provider presets, and `isInChina` behavior are removed, not rebranded. Global/EN is the only default. zh translations and CJK font support stay — that's i18n, not region targeting.
2. **Rebrand is find-and-verify, not rewrite.** No architectural refactors during WS1–3; those happen in WS4 where they stick.
3. **Strip before ship.** No Dusk build leaves CI with Dusk telemetry/update endpoints live.
4. **Upstream-syncable always:** Dusk modifications stay inside `packages/dusk`; Dusk-only infra (docs, Fugoku scripts) stays outside.

## What the greenfield scaffold still gives us

| Greenfield asset | Use in fork world |
|---|---|
| Design token system (`packages/renderer`) | Source for the dusk palette/theme in WS1 |
| Drizzle schema (workspaces/artifacts/jobs) | Data-model sketch for WS4 workspace layer |
| Agent runtime + lifecycle design | Reference for WS4 agent-task framing |
| Security/IPC hardening notes (`docs/electron-security*.md`) | Checklist when touching Dusk IPC |
| 16 product docs in `docs/` | Unchanged product direction |
