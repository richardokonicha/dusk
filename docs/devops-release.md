# Dusk — DevOps & Release Engineering

This document describes the release engineering setup that actually exists after the
alpha-readiness sweep. It covers the two GitHub Actions workflows, the
`electron-builder` configuration, and the pre-release validation flow.

## 1. CI Pipeline

### 1.1 `.github/workflows/ci.yml`

Triggers on push to `main` and on pull requests targeting `main`. Three jobs.
Installs **must** run inside `packages/dusk` — the `patchedDependencies` and
workspace overrides live in `packages/dusk/pnpm-workspace.yaml`, so every
install step uses `working-directory: packages/dusk`.

| Job | Runner | Steps |
| --- | --- | --- |
| `lint-and-build` | `ubuntu-latest` | checkout → setup pnpm → setup Node 24.15 → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build` |
| `test` | `ubuntu-latest` | checkout → setup pnpm → setup Node 24.15 → `pnpm install --frozen-lockfile` → `pnpm test` (timeout 45 min) |
| `build-desktop` | matrix | checkout → setup pnpm → setup Node 24.15 → `pnpm install --frozen-lockfile` → `hdiutil detach -all` (macOS only) → package → upload artifacts |

`build-desktop` is what proves macOS and Windows packaging works:

| Matrix entry | Runner | Script | Zip fallback |
| --- | --- | --- | --- |
| `macos-arm64` | `macos-14` | `build:mac:arm64` | `build:mac:arm64:zip` |
| `macos-x64` | `macos-14` | `build:mac:x64` | `build:mac:x64:zip` |
| `windows-x64` | `windows-latest` | `build:win:x64` | — |
| `windows-arm64` | `windows-latest` | `build:win:arm64` | — |

The packaging step retries once after `hdiutil detach -all`, then falls back to
the zip target, because `hdiutil` intermittently fails with "Device not
configured" on the macOS runners. Artifacts (`*.dmg`, `*.zip`, `*.exe`,
`*.blockmap`, `latest*.yml`) are uploaded per matrix entry with 14-day retention
and `if-no-files-found: error`.

`pnpm lint` is the gate that runs in CI — it covers format + oxlint + eslint +
typecheck + i18n:check. `pnpm test:lint` (oxlint `--deny-warnings`) is **not** used
in CI because it fails on 47 pre-existing warnings.

### 1.2 Pipeline overview

```
GitHub Event (push to main / PR to main / v* tag)
    │
    ▼
┌──────────────┐
│  pnpm lint   │  oxlint + eslint + typecheck + i18n:check + format
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  pnpm build  │  electron-vite build
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  pnpm test   │  vitest (all projects)
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│  desktop packaging (matrix)     │  macos-14: arm64 + x64
│  electron-builder               │  windows-latest: x64 + arm64
└─────────────────────────────────┘
```

## 2. Release Pipeline

### 2.1 `.github/workflows/release.yml`

Triggers on tags matching `v*`. A six-entry matrix, `fail-fast: false`, with
`defaults.run.working-directory: packages/dusk`. Per-entry scripts read from
`packages/dusk/package.json`:

| Runner | Matrix entry | Script | Zip fallback |
| --- | --- | --- | --- |
| `macos-14` | `macos-arm64` | `build:mac:arm64` | `build:mac:arm64:zip` |
| `macos-14` | `macos-x64` | `build:mac:x64` | `build:mac:x64:zip` |
| `windows-latest` | `windows-x64` | `build:win:x64` | — |
| `windows-latest` | `windows-arm64` | `build:win:arm64` | — |
| `ubuntu-latest` | `linux-x64` | `build:linux:x64` | — |
| `ubuntu-latest` | `linux-arm64` | `build:linux:arm64` | — |

The Linux entries first install X11 build dependencies, because `selection-hook`
compiles X11 code that the runner image lacks headers for. Every entry packages
with `--publish never`, retries once after `hdiutil detach -all`, then falls back
to the zip target.

Windows signing is driven by `scripts/win-sign.js`, which reads the env vars in
§4. `WIN_SIGN` must be truthy for signing to actually run; the workflow sets it to
`true` only when `DUSK_CERT_PATH` is non-empty, so it is not itself a secret.

Artifacts are read from **`packages/dusk/dist`**, the electron-builder output
directory, not from `packages/dusk/out` (which holds the electron-vite bundle).

**Publishing** is done by a separate `publish` job that `needs: build`, so a single
failed matrix entry blocks publication and no partial release can ship. It runs on
`ubuntu-latest` with `permissions: contents: write`, downloads the per-entry
artifacts, stages the installers, and creates the release with
`softprops/action-gh-release@v2` using `draft: false`, `prerelease: true` and
`generate_release_notes: true`. `electron-builder.yml` has no `publish` block — the
workflow owns the release rather than electron-builder self-publishing.

### 2.2 `electron-builder.yml`

- `appId`: `com.dusk.app`
- `productName`: `Dusk`
- `directories.buildResources`: `build`
- `directories.output`: not set — defaults to `out` (i.e. `packages/dusk/out`)
- macOS: dmg + zip targets, hardened runtime, notarization via `scripts/notarize.js`
- Windows: nsis + portable targets, signed via `scripts/win-sign.js`
- Linux: AppImage + deb + rpm targets
- Release notes live under `releaseInfo.releaseNotes` with bilingual
  `<!--LANG:en-->` / `<!--LANG:zh-CN-->` / `<!--LANG:END-->` markers
- `scripts/release/validate-release-state.js` implements a draft-release flow
  (draft release, `workflow_dispatch`, branch/tag/SHA equality, manual publish
  gate). `release.yml` does **not** call it; the tag-push flow above is what runs.

## 3. Pre-Release Validation

Before committing a release-prep change (version bump + release notes update), run
the validator to confirm the change set is exactly what a release is allowed to
touch:

```bash
cd packages/dusk
node scripts/release/validate-prepared-release.js --target-version 0.1.0-alpha.3
```

The validator checks:

- The changed file set matches the expected set for the release type
  (`electron-builder.yml`, `package.json`, and for stable releases also
  `resources/dusk/release-history.json`).
- `package.json` changes **only** the `version` field.
- `electron-builder.yml` changes **only** `releaseInfo.releaseNotes`.
- Release notes contain one ordered set of bilingual markers with non-empty
  English and Chinese sections.
- For stable releases, `resources/dusk/release-history.json` starts with the new
  version and its notes match `electron-builder.yml` exactly.

For prereleases (`0.1.0-alpha.3`), the release history file must remain unchanged.

## 4. Secrets Management

Secrets referenced by the release workflow (configured per-repo under
Settings → Secrets and variables → Actions):

| Secret | Used for |
| --- | --- |
| `APPLE_ID` | macOS notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS notarization |
| `APPLE_TEAM_ID` | macOS notarization |
| `CSC_LINK` | Code signing certificate (macOS + Windows) |
| `CSC_KEY_PASSWORD` | Code signing certificate password |
| `DUSK_CERT_PATH` | Windows signing certificate path |
| `DUSK_CERT_KEY` | Windows signing key container |
| `DUSK_CERT_CSP` | Windows signing CSP |
| `WIN_SIGN_TIMESTAMP_URLS` | Comma-separated timestamp URLs (optional) |

`WIN_SIGN` is deliberately absent from this table: the workflow derives it from
`DUSK_CERT_PATH` rather than reading it from the repository.

**Current status: no secrets are configured** (`gh secret list` returns empty).
macOS notarization is therefore skipped — `scripts/notarize.js` returns early
without `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` — and
Windows installers are unsigned. Every published alpha is unsigned, so users meet
Gatekeeper and SmartScreen warnings on first launch.

## 5. Distribution Channels

- **GitHub Releases** — primary distribution channel. The `publish` job in
  `release.yml` creates a pre-release automatically on every `v*` tag.
- Assets: DMG/zip (mac), setup + portable EXE (win), AppImage/deb/rpm (linux).
- A macOS x64 entry may ship zip-only: the `hdiutil` fallback in `release.yml`
  replaces the DMG when volume creation fails on the runner. `v0.1.0-alpha.2`
  shipped this way.

---

*This DevOps plan reflects what exists after the alpha-readiness sweep. It is the
single source of truth for the CI and release setup.*