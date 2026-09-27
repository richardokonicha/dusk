# Dusk — DevOps & Release Engineering

This document describes the release engineering setup that actually exists after the
alpha-readiness sweep. It covers the two GitHub Actions workflows, the
`electron-builder` configuration, and the pre-release validation flow.

## 1. CI Pipeline

### 1.1 `.github/workflows/ci.yml`

Triggers on push to `main` and on pull requests targeting `main`. Two jobs, both on
`ubuntu-latest`. Installs **must** run inside `packages/dusk` — the
`patchedDependencies` and workspace overrides live in
`packages/dusk/pnpm-workspace.yaml`, so every install step uses
`defaults.run.working-directory: packages/dusk`.

| Job | Steps |
| --- | --- |
| `lint-and-build` | checkout → setup pnpm → setup Node 24.15 → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build` |
| `test` | checkout → setup pnpm → setup Node 24.15 → `pnpm install --frozen-lockfile` → `pnpm test` (timeout 45 min) |

`pnpm lint` is the gate that runs in CI — it covers format + oxlint + eslint +
typecheck + i18n:check. `pnpm test:lint` (oxlint `--deny-warnings`) is **not** used
in CI because it fails on 47 pre-existing warnings.

### 1.2 Pipeline overview

```
GitHub Event (push/PR/tag)
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
└──────────────┘
```

## 2. Release Pipeline

### 2.1 `.github/workflows/release.yml`

Triggers on tags matching `v*`. Matrix of three OS runners; installs run inside
`packages/dusk`. Per-OS build scripts (read from `packages/dusk/package.json`):

| Runner | Script | Signing secrets referenced |
| --- | --- | --- |
| `macos-14` (arm64) | `pnpm build:mac` | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD` |
| `windows-latest` | `pnpm build:win` | `WIN_SIGN`, `DUSK_CERT_PATH`, `DUSK_CERT_KEY`, `DUSK_CERT_CSP`, `WIN_SIGN_TIMESTAMP_URLS`, `CSC_LINK`, `CSC_KEY_PASSWORD` |
| `ubuntu-latest` | `pnpm build:linux` | (none) |

Windows signing is driven by `scripts/win-sign.js`, which reads the env vars listed
above. `WIN_SIGN` must be set to a truthy value for signing to actually run.

Artifacts are uploaded from `packages/dusk/out` (the default `electron-builder`
output directory — `electron-builder.yml` sets `directories.buildResources` but
does not set `directories.output`).

**Publishing:** `electron-builder.yml` currently has no `publish` block (the
generic provider URL is commented out as a TODO placeholder). The release workflow
therefore does not publish to GitHub releases; this is tracked as a TODO in the
workflow file.

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

## 3. Pre-Release Validation

Before committing a release-prep change (version bump + release notes update), run
the validator to confirm the change set is exactly what a release is allowed to
touch:

```bash
cd packages/dusk
node scripts/release/validate-prepared-release.js --target-version 0.1.0-alpha.1
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

For prereleases (`0.1.0-alpha.1`), the release history file must remain unchanged.

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
| `WIN_SIGN` | Enable Windows code signing |
| `DUSK_CERT_PATH` | Windows signing certificate path |
| `DUSK_CERT_KEY` | Windows signing key container |
| `DUSK_CERT_CSP` | Windows signing CSP |
| `WIN_SIGN_TIMESTAMP_URLS` | Comma-separated timestamp URLs (optional) |

## 5. Distribution Channels

- **GitHub Releases** — primary distribution channel (currently disabled pending
  the `publish` configuration in `electron-builder.yml`).
- Assets: DMG/zip (mac), EXE (win), AppImage/deb/rpm (linux).

---

*This DevOps plan reflects what exists after the alpha-readiness sweep. It is the
single source of truth for the CI and release setup.*