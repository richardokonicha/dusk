# Dusk — Open Decisions

Tracking unresolved choices that block the build. Each has a default so work isn't stalled.

| # | Decision | Resolution | Status |
|---|---|---|---|
| D1 | Fork Cherry source vs greenfield | **Greenfield** — Cherry is AGPL-3.0; a fork risks copyleft bleeding into commercial Fugoku. See `cherry-source-scout.md`. | ✅ Resolved |
| D2 | Tech stack | **Electron + Vite + React + TS, pnpm monorepo, better-sqlite3** (desktop, mirroring Cherry desktop — reimplemented greenfield). Mobile later: React Native + Expo + Drizzle, `@ai-sdk/*` multi-provider. | ✅ Resolved (informed by reference clones) |
| D3 | Launch scope | Desktop-only (mac/win/linux) | 🟡 Default set |
| D4 | Pricing/distribution | Decide after MVP, not now | 🟡 Deferred |
| D5 | Final brand lock | **Dusk** (Work OS tagline) | 🟡 Lock before public launch |
| D6 | Commercial license from CherryHQ? | Only if budget frees up for a faster proprietary ship | 📦 Revisit later |

## Next blocking action

**D2 (tech stack)** is now the gate for Phase 1 implementation. D1 is resolved: build greenfield, Cherry as reference.
