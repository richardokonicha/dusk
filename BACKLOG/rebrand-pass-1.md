# Dusk — Rebrand Pass 1 (executable tasks)

Compiled 2026-09-05 from three audits of `packages/dusk` (Dusk Studio v2.0.12).
For audit rationale see `docs/fork-strategy.md` (WS1 Rebrand, WS2 Strip, WS3 Packaging).

Legend: **[B]** blocker (build/shipping fails or Dusk infra is hit without it) · **[C]** cleanup

**Status 2026-09-06:** Pass 1 complete — Tracks A, B, C, D, E, F done; G+H are pass 2. Final gates: typecheck ✅, build ✅ (2m04s), region/updater/scripts tests ✅ after review fixes. Assets generated (twilight crescent icon set) — A9 done. Findings from `/review uncommitted` fixed: region default CN→US, updater gated off without publish config, OAuth client-id mismatch flagged. Rules added to root AGENTS.md: no CN-market carryover, no dusk naming anywhere. Note: `release-workflow.test.ts` deleted wholesale (it pinned the removed GH workflows; Dusk release process will be rebuilt on GitLab under Track F follow-up).

---

## Track A — Identity & packaging (package as Dusk) — ✅ DONE (except A9)

- [x] A1 **[B]** `packages/dusk/package.json` — `name` → `dusk`, `desktopName` → `Dusk.desktop`, `author` → Dusk contact, `homepage` → Dusk repo. Also removed the 10 `build:*:cn` scripts (CN config deleted, see A3).
- [x] A2 **[B]** `packages/dusk/electron-builder.yml` — `appId: com.dusk.app`, `productName: Dusk`, `executableName`s, `protocols` → `dusk`, linux desktop entry, publish block disabled with TODO to point at future Dusk update server, releaseNotes replaced.
- [x] A3 **[B]** `packages/dusk/electron-builder.cn.config.cjs` — **deleted** (CN edition dropped; residual edition cleanup below).
- [x] A4 **[B]** `packages/dusk/src/shared/utils/constants.ts` — `APP_NAME = 'Dusk'`
- [x] A5 **[B]** Home dir `.duskstudio` → `.dusk` (`src/main/core/paths/constants.ts`, boot config schemas). Fresh start, no migration.
- [x] A6 **[B]** `src/main/core/preboot/chromiumFlags.ts` — chromium class/name → dusk
- [x] A7 **[C]** `duskstudio://` scheme → `dusk://` (ProtocolService, MediaProtocolService, renderer oauth.ts)
- [x] A8 **[C]** UA strings (WebviewService, MainWindowService, systemInfo.ts)
- [ ] A9 **[B]** Assets — replace `build/icon.ico`, `build/icon.icns`, `build/icon.png`, `build/logo.png`, `src/renderer/assets/images/logo.png` with Dusk assets. **BLOCKED: image generation quota failed (402).** Need dusk icon set designed/generated, then `pnpm` assets regen if applicable.

## Track B — Telemetry & Dusk services strip — ✅ DONE

- [x] B1 **[B]** Analytics removed: `AnalyticsService.ts` deleted, all track* callsites removed, `@duskstudio/analytics-client` dep removed from package.json
- [x] B2 **[B]** `src/main/utils/http.ts` — `defaultAppHeaders()` now returns `{}` (no dusk-ai referer/title)
- [x] B3 **[B]** Dusk Cloud removed entirely (service, provider, IPC, `duskai-subscription`, presets, `MAIN_VITE_DUSK*` envs)
- [x] B4 **[B]** DuskIN OAuth removed (service, runtime provider, IPC, UI components `DuskInOauth/DuskInSettings/FreeTrialModelTag`)
- [x] B5 **[B]** DuskAI signature provider removed
- [x] B6 **[C]** Diagnostics upload neutralized (client deleted; `DiagnosticBundleService` upload calls are no-ops — local export retained)
- [x] B7 **[C]** `RegionService.fetchCountry()` static default (no ipinfo call)
- [x] B8 **[C]** `miniAppManifest.ts` — `MINI_APP_OFFICIAL_ORIGINS` emptied; `com.duskstudio.*` untouched there (test-side cleanup done; revisit in pass 2)
- [x] B9 **[C]** `ProviderRegistryUpdaterService` remote catalog fetch disabled (bundled catalog is source of truth); `AppUpdaterService.fetchReleaseHistory` no-op'd (no Dusk update server yet)

## Track C — Update channel & catalogs

- [x] C1 **[B]** Done via B9 (updater no-op until Dusk server exists)
- [x] C2 **[C]** Done via B9
- [ ] C3 **[C]** `electron.vite.config.ts` — `resources/dusk-studio/release-history.json` path → rename dir/file (needs a new Dusk release-history.json placeholder first)

## Track D — UI strings, i18n, menus — ✅ DONE

- [x] D1 **[B]** AppMenuService → docs.dusk.app / gitlab.com/fugoku.inc/dusk
- [x] D2 **[B]** 30+ renderer/main user-visible strings rebranded; also caught by tests: `defaultAssistant.ts` preset ("Dusk Assistant" → "Dusk Assistant", incl. 中文 "Dusk 助手")
- [x] D3 **[C]** All 26 locales swept; `pnpm i18n:sync` run; i18n check passed (69,667 translations, zero placeholders). NOTE: mechanical substitution in non-EN locales — schedule a native-speaker polish pass
- [x] D4 **[C]** Legacy `~/.duskstudio`/`duskstudio.sqlite` read paths preserved; backup reader accepts both 'Dusk' and 'Dusk Studio'

## Track E — Theme (dusk palette) — ✅ DONE

- [x] E1 **[B]** `--cs-brand-50..950` replaced with twilight violet-indigo ramp (OKLCH-even; 500=#824deb, 950=#12042b); amber accent retained as horizon glow; dark ring now follows `--cs-primary`
- [x] E2 **[C]** product.css/theme.css/contract.css/shadcn.css semantics + comments updated; theme.css regenerated via `theme:build`; 57/57 ui package tests pass

## Track G — CN-market purge (repo rule: no China-market carryover, see AGENTS.md)

Done in fixes pass:
- [x] RegionService static default `'CN'` → `'US'` (no CN-first routing for Dusk users)
- [x] CN edition packaging + CN config deleted (Track A)
- [x] duskai-subscription/DuskIN/DuskAI-signature providers removed (Track B)

Remaining sweep:
- [ ] G1 **`BinaryManager.ts`, `binaryManager/pythonRuntime.ts`** — remove China-mirror selection branch entirely (always global mirrors)
- [ ] G2 **`JinaProvider.ts`** — drop `s.jinaai.cn`/`r.jinaai.cn` host swap; `miniApp install/httpSource.ts` — drop CN-mirror-first reordering (with empty official origins, simplify to single endpoint)
- [ ] G3 **webSearch/painting presets** — audit `src/shared/data/presets/*` for CN-region provider defaults (e.g. Bocha) and CN-only hosts
- [ ] G4 **OAuth quick-login flows** (`src/renderer/services/oauth.ts`) — aihubmix/PPIO use Dusk-registered client ids + `dusk_studio_oauth` callback; register Dusk OAuth clients or remove the flows (TODOs placed in file). API-key entry unaffected.
- [ ] G5 **`isInChina()`** — after G1+G2, the branch predicate has no CN-true path left; collapse consumers and consider deleting RegionService entirely
- [ ] G6 **CN-only copy in zh locales** — review zh-cn/zh-tw values that pitch CN-only services (Dusk Cloud Q&A etc.) post-strip. NOTE: zh translations themselves stay (i18n ≠ region)

## Track F — CI

- [ ] F1 **[B]** `.github/workflows/` — repo is GitLab-hosted: write `.gitlab-ci.yml` for lint/typecheck/build; `ci.yml` content is the reference
- [ ] F2 **[C]** Delete Dusk GitHub release workflows (release/publish/prepare/post/nightly/preview/gitcode/feishu/claude-action) and Dusk repo guards/secrets references. NOTE: `scripts/release/edition.ts` + CN workflow contract tests were deleted with the CN edition — cross-check any remaining workflow→script references (F1 will cover)

## Track H — "dusk" name purge (repo rule: no dusk branding/identifiers)

Per `AGENTS.md`: nothing shipped may carry `dusk` in any case. Attribution notices + legacy import compat are the only exceptions.

- [ ] H1 **[B]** Package renames: `@duskstudio/ai-core` → `@dusk/ai-core`, `@duskstudio/ui` → `@dusk/ui`, `@duskstudio/ai-sdk-provider` → `@dusk/ai-sdk-provider`, etc. — rename package dirs, `name` fields, and every import specifier across the monorepo (`@duskstudio/` appears in thousands of imports; mechanical codemod + full gate after)
- [ ] H2 **[B]** `duskai` + `duskin` provider presets: both are Dusk-owned infrastructure (api.dusk-ai.com) — remove from `src/shared/data/presets/duskai.ts`, ProviderService guards, `systemProviderId.ts` enum (regenerate via `pnpm gen:system-provider-ids`), and the `packages/provider-registry` catalog data (duskin still listed there as a dead preset); delete `DUSKAI_*`/`duskin` constants. Migration: existing installs with duskai keys → keep read-only, hide from new-provider lists
- [ ] H3 **[C]** Identifier sweep: grep -ri `dusk` in src/ after H1/H2 and rename remaining symbols (`DUSK_EDITION`→edition env, `isManagedDusk*`, `duskAssistant` keys, etc.). i18n KEY renames allowed here if all references update in the same commit (26 locale files + code, single sweep)
- [ ] H4 **[C]** `assets-brand/` and build asset filenames now dusk — confirm no dusk-named asset remains under `packages/dusk/` (build/, resources/, packages/*/assets)

## Keep (verified fine, no action)

- No global sign-in gate — app runs fully with user-supplied provider keys ✅
- No Sentry/PostHog/GA/Amplitude/Mixpanel — only the one analytics client (removed) ✅
- Provider system supports OpenAI-compatible presets — Fugoku Gateway later = config-only provider preset ✅

## Follow-ups discovered during pass 1

- **`packageManager` field removed** from `packages/dusk/package.json`: upstream pins `pnpm@11.8.0`+hash which fails pnpm's self-verification on darwin-x64 (no `@pnpm/exe.darwin-x64` in upstream lockfile). Reconcile decision on next upstream sync.
- **Node engines**: repo wants `>=24.11.1 <24.16.0`; installed/built fine with Node 26.5.0 + `--engine-strict=false`. Decide whether to widen the engines range or adopt the pinned Node.
- **`build:cn` script still exists** (electron-vite edition define only) — harmless; fold into single-edition cleanup.
- **`@duskstudio/*` internal package names** — cosmetic; rename only if publishing packages.
- **CN edition types remain** (`APP_EDITIONS` includes 'cn', `duskEdition` metadata) — single-edition simplification is its own task.
- **GitHub Copilot service** (`CopilotService.ts`): third-party, optional — keep or cut in pass 2.
- **`OpenClawService`** — review scope, then decide.
- **300+ bundled assistant presets** — trim/curate during Phase 1.5 (see `docs/dusk-diff.md`).
- **Track A note**: `src/renderer/services/oauth.ts` still contains Dusk-era OAuth client ids (dusk_studio_oauth) — external API contracts; revisit when deciding provider presets.
