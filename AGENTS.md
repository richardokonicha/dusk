# DUSK — agent rules

Project rules for anyone (human or agent) working in this repository. The fork's own conventions live in `packages/dusk/AGENTS.md` and apply inside `packages/dusk/` unless they conflict with rules here — these win.

## Hard rules

1. **No China-market carryover from Dusk Studio.** The upstream fork targets the Chinese market; Dusk does not. Do not port, keep, or revive: CN edition machinery (`electron-builder.cn.config.cjs`, `build:*:cn` scripts, `DUSK_EDITION=cn` code paths), CN-region defaults or CN-first routing (RegionService defaults, `isInChina()` branch ordering), Chinese-mirror endpoints or hosts (download registries, update servers, `*.cn` provider/search variants), CN provider presets (e.g. DuskIN), or duski18n-key seeded CN-region behavior. When a choice is geographically neutral, pick the global/EN default. Internationalization for Chinese-speaking users (zh translations, CJK fonts) is NOT in scope of this rule — it stays.

2. **Standalone-first, no Dusk infrastructure.** No outbound calls to Dusk-owned domains (`dusk-ai.com`, `duskai.com`, `raw.githubusercontent.com/DuskHQ`, `gitcode.com/DuskHQ`). No Dusk telemetry. New provider presets are plain OpenAI-compatible configs.

3. **No "dusk" in the product, period.** The Dusk name is part of the Chinese-market branding; ours is Dusk. NOTHING carries `dusk`/`dusk-studio`/`DuskStudio` — no exceptions: not user-facing strings, not file/asset names, not package names, not identifiers, not constants, not comments, not i18n keys, not presets, not URLs. Case-insensitive `dusk` matches anywhere in the repo are defects to rename or remove. Old backups/data import must also work without the word surviving in our code — map legacy paths by position/glob, never by literal brand strings.

3. **`packages/dusk` is the product; sibling `packages/` are the design reference.** All product changes land in the fork. The greenfield scaffold (`desktop`, `renderer`, `shared`) is reference-only: port ideas from it, never extend it in place.

## Working agreements

- Verify with the fork's gates before claiming done: `pnpm typecheck`, `pnpm build`, and the affected tests (see `packages/dusk/AGENTS.md` for the full gate matrix).
- Rebrand edits change values, not keys/identifiers: i18n key names stay stable across the sweep.
