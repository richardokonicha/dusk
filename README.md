# Dusk Work OS

Dusk is a personal work operating system combining task management, project tracking, and knowledge base in a single desktop application.

## Prerequisites

- Node.js >= 22.x LTS
- pnpm >= 11.x

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Runs the Electron app in development mode with hot-reloading.

## Build

```bash
pnpm build
```

Builds the desktop application for production.

## Testing

```bash
pnpm test
```

Runs unit tests with Vitest.

## Lint

```bash
pnpm lint
```

## Typecheck

```bash
pnpm typecheck
```

## Project Structure

```
dusk/
├── packages/
│   ├── desktop/     # Electron main process + preload
│   ├── renderer/    # React UI (Vite + TailwindCSS v4)
│   └── shared/      # Shared types and schema
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```
