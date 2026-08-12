# 08 — DevOps & Release Review

**Reviewer:** DevOps/Release Engineering Agent  
**Date:** 2026-08-11  
**Scope:** CI/CD pipeline, packaging, distribution, auto-update, monitoring

## Verdict: APPROVED with missing pieces

### What works

- **GitHub Actions pipeline structure** is clean and follows best practices (lint → typecheck → test → build → package).
- **electron-builder configuration** covers all three target platforms with appropriate formats (DMG, EXE, AppImage, deb, rpm).
- **Auto-update via electron-updater + GitHub Releases** is the standard approach for Electron apps.
- **Secrets management** references GitHub Secrets correctly.

### Critical concerns

**1. No staging/preview environment in the pipeline.**

The CI pipeline builds and tests, but there's no preview build that QA can install before a release tag. The only "preview" is the dev server running locally.

**Recommendation:** Add a preview build job to the CI pipeline. On PR merge to `main`, build a preview package and upload it as a GitHub Actions artifact. QA can download and test it before a release is cut.

**2. Code signing is listed but not configured.**

The electron-builder config references `CSC_LINK` and `CSC_KEY_PASSWORD` secrets, but doesn't document:
- How to obtain a signing certificate
- What type (Developer ID Application for macOS, EV for Windows)
- The cost and timeline for certificate issuance
- Notarization process for macOS

**Recommendation:** Create a `SIGNING.md` document with step-by-step instructions for obtaining and configuring code signing certificates. macOS notarization especially requires an Apple Developer account ($99/yr) and specific provisioning. Start the certificate process **now** — it can take 1-2 weeks.

### Medium concerns

- **No dependency update automation.** The plan mentions Dependabot in passing but doesn't configure it. Add Dependabot to the repo with:
  - Weekly security patches (auto-merge for patch versions)
  - Monthly minor version updates (PR-based, manual review)
- **No release drafter config.** The `release.yml` references `release-drafter/release-drafter@v6` but there's no `.github/release-drafter.yml`. Create it.
- **Bundle size monitoring CI step is aspirational.** The testing strategy mentions a `analyze-bundle` script, but the devops plan doesn't implement it. Add a simple gzip size check to CI that fails if renderer bundle exceeds 5MB.
- **Sentry integration is mentioned but not installed.** `devops-release.md` shows Sentry code, but `package.json` doesn't include `@sentry/electron`. Add it in Sprint 1.

### Minor concerns

- **Homebrew tap not configured.** The plan mentions `brew install fugoku/tap/dusk` but there's no tap repo. Create `fugoku/homebrew-tap` as a separate repo.
- **Winget manifest:** Windows package manager requires a manifest file on a public repo. Plan for this.
