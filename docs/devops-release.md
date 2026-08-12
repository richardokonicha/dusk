# Dusk — DevOps & Release Engineering

## 1. CI/CD Pipeline Architecture

### 1.1 Pipeline Overview

```
GitHub Event (push/PR/tag)
    │
    ▼
┌─────────────────┐
│  Lint & Format  │  biome check, prettier
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Type Check     │  TypeScript strict mode
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Unit Tests     │  vitest (packages/*)
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Build          │  vite build (renderer), tsc (desktop)
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  E2E Tests      │  Playwright (optional for PRs)
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Package        │  electron-builder (mac/win/linux)
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Release        │  GitHub Release (on tag)
└─────────────────┘
```

### 1.2 GitHub Actions Workflows

**`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
```

**`.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
      
      - name: Package (macOS)
        if: matrix.os == 'macos-latest'
        run: pnpm package:mac
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
      
      - name: Package (Windows)
        if: matrix.os == 'windows-latest'
        run: pnpm package:win
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
      
      - name: Package (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: pnpm package:linux
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}
          path: |
            packages/desktop/dist/*.dmg
            packages/desktop/dist/*.exe
            packages/desktop/dist/*.AppImage
            packages/desktop/dist/*.deb
            packages/desktop/dist/*.rpm
```

---

## 2. Packaging Configuration

### 2.1 electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.fugoku.dusk
productName: Dusk
copyright: Copyright © 2026 Fugoku

directories:
  output: packages/desktop/dist
  buildResources: packages/desktop/build

files:
  - packages/desktop/dist/**/*
  - packages/renderer/dist/**/*
  - node_modules/**/*

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: pkg
  notarize: true
  identity: "Fugoku Inc."

win:
  target:
    - target: nsis
      arch: [x64, ia32]
    - target: portable
  publisherName: Fugoku Inc.

linux:
  target:
    - target: AppImage
    - target: deb
    - target: rpm
  category: Utility

# Code signing
# macOS: Use Apple Developer certificate
# Windows: Use EV code signing certificate

# Auto-update
publish:
  provider: github
  owner: Fugoku
  repo: dusk
```

### 2.2 Build Scripts

```json
{
  "scripts": {
    "build": "pnpm --filter desktop build && pnpm --filter renderer build",
    "build:desktop": "cd packages/desktop && tsc && vite build",
    "build:renderer": "cd packages/renderer && vite build",
    "package": "pnpm build && electron-builder",
    "package:mac": "electron-builder --mac",
    "package:win": "electron-builder --win",
    "package:linux": "electron-builder --linux",
    "package:all": "electron-builder --mac --win --linux"
  }
}
```

---

## 3. Release Process

### 3.1 Release Checklist

```markdown
## Pre-Release
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Manual smoke test passed (mac/win/linux)
- [ ] Code signed (if required)
- [ ] Notarized (macOS)

## Release
- [ ] Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`
- [ ] Push tag: `git push origin v0.1.0`
- [ ] GitHub Actions builds packages
- [ ] GitHub Release created with assets
- [ ] Release notes published

## Post-Release
- [ ] Update website download links
- [ ] Announce on social media
- [ ] Update documentation
- [ ] Monitor crash reports
```

### 3.2 Automated Release Notes

```yaml
# .github/workflows/release.yml (additional step)
- name: Generate release notes
  uses: release-drafter/release-drafter@v6
  with:
    config-file: .github/release-drafter.yml
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 4. Auto-Update System

### 4.1 electron-updater Configuration

```typescript
// packages/desktop/src/main/auto-update.ts
import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

export class AutoUpdateService {
  constructor() {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      // Notify user via IPC
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('update:available');
      });
    });
    
    autoUpdater.on('update-downloaded', () => {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('update:downloaded');
      });
    });
  }
  
  async installUpdate() {
    autoUpdater.quitAndInstall();
  }
}
```

```json
// package.json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "Fugoku",
      "repo": "dusk"
    }
  }
}
```

---

## 5. Distribution Channels

### 5.1 GitHub Releases

- Primary distribution channel
- Assets: DMG (mac), EXE (win), AppImage/deb/rpm (linux)
- Auto-generated release notes from PRs

### 5.2 Package Managers (Phase 2)

```bash
# Homebrew (macOS/Linux)
brew install fugoku/tap/dusk

# winget (Windows)
winget install Fugoku.Dusk

# apt (Debian/Ubuntu)
# Add repository to apt sources

# snap (Linux)
snap install dusk
```

### 5.3 Direct Download

- Website: https://dusk.fugoku.ai/download
- Links to GitHub releases
- Checksums for verification

---

## 6. Environment Management

### 6.1 Environment Variables

```bash
# .env.development
NODE_ENV=development
VITE_DEV_SERVER_URL=http://localhost:5173
ELECTRON_IS_DEV=true

# .env.production
NODE_ENV=production
VITE_DEV_SERVER_URL=
ELECTRON_IS_DEV=false
```

### 6.2 Secrets Management

```yaml
# GitHub Secrets (Settings → Secrets)
APPLE_ID                    # Apple Developer ID
APPLE_ID_PASSWORD           # App-specific password
CSC_LINK                    # Code signing certificate (base64)
CSC_KEY_PASSWORD            # Certificate password
GITHUB_TOKEN                # For releases
SENTRY_DSN                  # Crash reporting
```

---

## 7. Monitoring & Observability

### 7.1 Crash Reporting (Sentry)

```typescript
// packages/desktop/src/main/sentry.ts
import * as Sentry from '@sentry/electron';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `dusk@${app.getVersion()}`,
    
    // User opt-in
    beforeSend(event, hint) {
      if (!getSetting('telemetry.enabled')) {
        return null;
      }
      // Scrub sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    },
  });
}
```

### 7.2 Error Tracking

```typescript
// packages/desktop/src/main/error-handler.ts
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  Sentry.captureException(error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  Sentry.captureException(reason);
});
```

### 7.3 Performance Monitoring

```typescript
// Track app startup time
const startupStart = Date.now();
app.whenReady().then(() => {
  const startupTime = Date.now() - startupStart;
  console.log(`App started in ${startupTime}ms`);
});
```

---

## 8. Developer Experience

### 8.1 Local Development

```bash
# Terminal 1: Start renderer dev server
pnpm --filter renderer dev

# Terminal 2: Start Electron
pnpm --filter desktop dev
```

### 8.2 Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: biome-check
        name: biome check
        entry: pnpm biome check --write
        language: system
        types: [javascript, typescript, jsx, tsx]
      - id: typecheck
        name: typecheck
        entry: pnpm typecheck
        language: system
        types: [javascript, typescript, jsx, tsx]
```

### 8.3 Conventional Commits

```
feat: add workspace switcher
fix: resolve IPC memory leak
docs: update architecture docs
refactor: simplify agent runtime
test: add workspace tests
chore: update dependencies
```

---

*This DevOps plan is ready for implementation. All pipelines, configs, and processes are defined.*
