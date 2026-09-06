# Dusk — Open Decisions

Tracking unresolved choices that block the build. Each has a default so work isn't stalled.

| # | Decision | Resolution | Status |
|---|---|---|---|
| D1 | Fork Dusk source vs greenfield | **Fork** — Dusk Studio becomes the Dusk base (owner decision, 2026-09-05; supersedes scout recommendation). License posture deferred per owner — shipping focus, source stays visible. Greenfield scaffold retained as design reference. | ✅ Resolved (owner override) |
| D2 | Tech stack | **Inherited from Dusk fork** (Electron + React + TS). Greenfield stack (pnpm monorepo, better-sqlite3/Drizzle, Vite) applies only to any future net-new Dusk services. | ✅ Resolved (follows D1 fork) |
| D3 | Launch scope | Desktop-only (mac/win/linux) | 🟡 Default set |
| D4 | Pricing/distribution | Decide after MVP, not now | 🟡 Deferred |
| D5 | Final brand lock | **Dusk** (Work OS tagline) | 🟡 Lock before public launch |
| D6 | Commercial license from DuskHQ? | Only if budget frees up for a faster proprietary ship | 📦 Revisit later |

## Next blocking action

**D2 (tech stack)** is now the gate for Phase 1 implementation. D1 is resolved: build greenfield, Dusk as reference.
