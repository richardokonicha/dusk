# DUSK — agent rules

Project rules for anyone (human or agent) working in this repository. The fork's own conventions live in `packages/dusk/AGENTS.md` and apply inside `packages/dusk/` unless they conflict with rules here — these win.

## Hard rules

1. **No China-market carryover.** This codebase descends from a China-market project; Dusk does not target that market. Do not port, keep, or revive: CN edition machinery (`electron-builder.cn.config.cjs`, `build:*:cn` scripts, `*_EDITION=cn` code paths), CN-region defaults or CN-first routing (RegionService defaults, `isInChina()` branch ordering), Chinese-mirror endpoints or hosts (npmmirror/taobao download mirrors, `*.cn` provider/search variants, `s.jinaai.cn`/`r.jinaai.cn` host swaps), CN provider presets, or upstream-branded i18n keys seeding CN-region behavior. When a choice is geographically neutral, pick the global/EN default. Internationalization for Chinese-speaking users (zh translations, CJK fonts) is NOT in scope of this rule — it stays.

2. **Standalone-first, no upstream infrastructure.** No outbound calls to domains owned by the project this descends from, and no upstream mirrors. No telemetry to any third party. New provider presets are plain OpenAI-compatible configs.

3. **No upstream brand name anywhere, period.** The product is Dusk. Nothing may carry the inherited brand or any of its spelling variants — no exceptions: not user-facing strings, not file/asset names, not package names, not identifiers, not constants, not comments, not i18n keys, not presets, not URLs, and not documentation. Case-insensitive matches of that name anywhere in the repo are defects to rename or remove. Two tolerated classes: (a) dictionary content where the word is a real word, not a brand — emoji keyword data and similar; (b) generic third-party license and attribution text that names other projects we legitimately depend on. Old backups/data import must work without the word surviving in our code — map legacy paths by position/glob, never by literal brand strings.

4. **`packages/dusk` is the product; sibling `packages/` are the design reference.** All product changes land in the fork. The greenfield scaffold (`desktop`, `renderer`, `shared`) is reference-only: port ideas from it, never extend it in place.

## Working agreements

- Verify with the fork's gates before claiming done: `pnpm typecheck`, `pnpm build`, and the affected tests (see `packages/dusk/AGENTS.md` for the full gate matrix).
- Rebrand edits change values, not keys/identifiers: i18n key names stay stable across the sweep.
