# DUSK — agent rules

Project rules for anyone (human or agent) working in this repository. The fork's own conventions live in `packages/dusk/AGENTS.md` and apply inside `packages/dusk/` unless they conflict with rules here — these win.

## Hard rules

1. **No China-market carryover from Cherry Studio.** The upstream fork targets the Chinese market; Dusk does not. Do not port, keep, or revive: CN edition machinery (`electron-builder.cn.config.cjs`, `build:*:cn` scripts, `CHERRY_EDITION`/`DUSK_EDITION=cn` code paths), CN-region defaults or CN-first routing (RegionService defaults, `isInChina()` branch ordering), Chinese-mirror endpoints or hosts (npmmirror/taobao download mirrors, `*.cn` provider/search variants, `s.jinaai.cn`/`r.jinaai.cn` host swaps), CN provider presets (e.g. CherryIN), or cherry-i18n-key seeded CN-region behavior. When a choice is geographically neutral, pick the global/EN default. Internationalization for Chinese-speaking users (zh translations, CJK fonts) is NOT in scope of this rule — it stays.

2. **Standalone-first, no Cherry infrastructure.** No outbound calls to Cherry-owned domains (`cherry-ai.com`, `cherryai.com`, `raw.githubusercontent.com/CherryHQ`, `gitcode.com/CherryHQ`). No Cherry telemetry. New provider presets are plain OpenAI-compatible configs.

3. **No "cherry" in the product, period.** The Cherry name is part of the Chinese-market branding; ours is Dusk. NOTHING carries `cherry`/`cherry-studio`/`CherryStudio` — no exceptions: not user-facing strings, not file/asset names, not package names, not identifiers, not constants, not comments, not i18n keys, not presets, not URLs. Case-insensitive `cherry` matches anywhere in the repo are defects to rename or remove. Only two tolerated classes: (a) emoji keyword data and similar non-brand dictionary content; (b) legal fork-provenance attribution (e.g. `license.html`, README) — required by AGPL — which must refer to the upstream project generically ("an AGPL-3.0 open-source desktop AI workspace project") and never by its name or URLs. Old backups/data import must also work without the word surviving in our code — map legacy paths by position/glob, never by literal brand strings.

4. **`packages/dusk` is the product; sibling `packages/` are the design reference.** All product changes land in the fork. The greenfield scaffold (`desktop`, `renderer`, `shared`) is reference-only: port ideas from it, never extend it in place.

## Working agreements

- Verify with the fork's gates before claiming done: `pnpm typecheck`, `pnpm build`, and the affected tests (see `packages/dusk/AGENTS.md` for the full gate matrix).
- Rebrand edits change values, not keys/identifiers: i18n key names stay stable across the sweep.
