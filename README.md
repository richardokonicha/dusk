# Dusk Work OS

[![CI](https://github.com/richardokonicha/dusk/actions/workflows/ci.yml/badge.svg)](https://github.com/richardokonicha/dusk/actions/workflows/ci.yml)
[![Release](https://github.com/richardokonicha/dusk/actions/workflows/release.yml/badge.svg)](https://github.com/richardokonicha/dusk/actions/workflows/release.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Dusk is a personal work operating system combining task management, project tracking, and knowledge base in a single desktop application. It runs as an Electron app on macOS, Windows, and Linux.

## Alpha status

Dusk is in alpha. Current version: `0.1.0-alpha.1`.

## Install (alpha)

Prebuilt installers are attached to each [GitHub Release](https://github.com/richardokonicha/dusk/releases) as a prerelease. Alpha builds are unsigned, so macOS Gatekeeper and Windows SmartScreen will warn on first launch.

- **macOS** — download the `.dmg` (Apple Silicon and Intel), drag Dusk to Applications.
- **Windows** — download the `.exe` installer (x64 and arm64).

Linux builds are produced by the release workflow but are not part of the alpha download set yet.

## Prerequisites

Building from source requires:

- Node.js >= 24.11.1 < 24.16.0
- pnpm 11.x

## Setup

```bash
# Run inside packages/dusk — the patchedDependencies and workspace overrides
# live there, so installs at the repo root will not resolve correctly.
cd packages/dusk
pnpm install
```

## Development

```bash
cd packages/dusk
pnpm dev
```

Runs the Electron app in development mode with hot-reloading.

## Build

```bash
cd packages/dusk
pnpm build
```

Builds the desktop application for production.

## Testing

```bash
cd packages/dusk
pnpm test
```

Runs unit tests with Vitest.

## Lint

```bash
cd packages/dusk
pnpm lint
```

## Typecheck

```bash
cd packages/dusk
pnpm typecheck
```

## CI and releases

- **CI** ([`ci.yml`](.github/workflows/ci.yml)) runs on every push and pull request to `main`: lint, unit tests, and desktop packaging builds on `macos-14` and `windows-latest`. Packaging artifacts are uploaded as workflow artifacts for manual smoke testing.
- **Release** ([`release.yml`](.github/workflows/release.yml)) runs on `v*` tags, builds macOS/Windows/Linux installers, and publishes them to a prerelease on the [Releases page](https://github.com/richardokonicha/dusk/releases).

To cut a release:

```bash
git tag v0.1.0-alpha.1
git push origin v0.1.0-alpha.1
```

## Project structure

The product is the Electron application in `packages/dusk/`:

```
packages/dusk/
├── src/main/            # Electron main process
├── src/renderer/        # React UI (Vite + TailwindCSS v4)
├── src/shared/          # Cross-process types and schema
├── packages/
│   ├── ai-core/         # @dusk/ai-core
│   ├── provider-registry/# @dusk/provider-registry
│   ├── ui/              # @dusk/ui (Shadcn UI + Tailwind CSS)
│   ├── ai-sdk-provider/ # @dusk/ai-sdk-provider
│   └── extension-table-plus/ # @dusk/extension-table-plus
├── electron-builder.yml
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.*.json
```
## License

Dusk is licensed under the [GNU Affero General Public License v3.0](LICENSE).

It is a fork of an AGPL-3.0 open-source desktop AI workspace project. This fork keeps that license and the attribution required by it.
