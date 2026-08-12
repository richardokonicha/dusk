# Contributing

Thank you for your interest in contributing to Dusk. This guide will help you get started.

## Code of Conduct

This project follows a standard code of conduct. By participating, you agree to uphold a welcoming and inclusive environment.

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 11.0.0
- Git

### Clone and Install

```bash
git clone https://github.com/fugoku/dusk.git
cd dusk
pnpm install
```

### Running the Desktop App

```bash
pnpm dev
```

### Building

```bash
pnpm build
```

## Project Structure

```
dusk/
├── packages/
│   ├── desktop/       # Desktop application (shell)
│   ├── core/          # Shared core logic
│   ├── providers/     # Provider implementations
│   └── agent/         # Agent system
├── docs/              # Documentation site
├── package.json       # Root package.json
└── pnpm-workspace.yaml
```

## Branching Model

- `main` — Stable releases
- `develop` — Integration branch
- `feature/*` — New features
- `fix/*` — Bug fixes
- `release/*` — Release preparation

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new provider support
fix: resolve workspace switching race condition
docs: update getting started guide
chore: bump dependencies
```

## Pull Requests

1. Fork the repository and create your branch from `develop`
2. Make your changes and add tests where applicable
3. Ensure `pnpm lint` and `pnpm typecheck` pass
4. Submit a pull request against `develop`
5. Request review from a maintainer

## Reporting Issues

Please use the issue tracker and include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, app version)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
