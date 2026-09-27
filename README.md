# Dusk Work OS

Dusk is a personal work operating system combining task management, project tracking, and knowledge base in a single desktop application.

## Prerequisites

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

## Alpha status

Dusk is in alpha. Current version: `0.1.0-alpha.1`.

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

The sibling `packages/desktop`, `packages/renderer`, and `packages/shared` directories in the repository root are the original greenfield scaffold, kept as a design reference only — they are not extended in place and are not part of the Dusk product.

## Repository

This GitHub repository.