# 03 — Legal & IP Review

**Reviewer:** Legal/IP Counsel  
**Date:** 2026-08-11  
**Scope:** AGPL contamination, licensing, compliance, privacy, trademark

## Verdict: CONDITIONALLY APPROVED — address 3 items before public launch

### What works

- **Greenfield decision is correct.** Dusk Studio is AGPL-3.0. Distributing a derivative work triggers copyleft. Greenfield eliminates this entirely.
- **MIT license recommendation** is appropriate for a commercial desktop product. Maximum flexibility, broad compatibility.
- **Local-first privacy model** is sound. Minimizes data protection obligations and builds user trust.
- **CLA requirement** for external contributors protects Fugoku's relicensing rights.

### Critical concerns

**1. `reference/` directory must be excluded from ALL distributions — enforce this in CI.**

The legal framework correctly states that Dusk reference code must never ship with Dusk. But there's no automated enforcement. A single mistaken build could ship AGPL code.

**Action:** Add a CI step that verifies no files from `reference/` appear in release artifacts. Also add `reference/` to `.gitignore` for release branches, or better, use a separate git subtree that isn't included in the main repo's release pipeline.

**2. Dependency license audit needs to happen before Phase 1 ships.**

The planned dependencies (Electron, React, Vite, better-sqlite3, TailwindCSS, shadcn/ui, Framer Motion, Radix UI, Lucide) are all MIT/Apache/ISC. But the project hasn't locked the exact package set. When packages are added in Sprint 1, each new dependency must be checked.

**Action:** Add `license-checker` (npm) to CI pipeline. Configure it to fail on AGPL, GPL, LGPL, SSPL, and BUSL dependencies. Run it on every PR.

**3. Privacy policy and terms of service must exist before any public beta.**

The legal framework marks these as "⬜" (not done). But the GTM plan targets a public beta in Week 5-6 and Product Hunt launch in Week 7. You cannot ship a product to users without a privacy policy.

**Action:** Draft privacy policy and terms before beta recruitment begins. Host at `dusk.ai/privacy` and `dusk.ai/terms` (or equivalent domain).

### Medium concerns

- **API key storage security:** The `SecureStorageService` uses Electron's `safeStorage`. This is correct for desktop, but `safeStorage` is not available on Linux in all configurations. Need a fallback (libsecret / keyctl). Document the Linux fallback.
- **Third-party license file:** `THIRD_PARTY_LICENSES.md` should be auto-generated at build time, not manually maintained. Add a build script.
- **Trademark filing:** "Dusk" is a common word. Start using ™ immediately upon first public appearance. File USPTO/EUIPO applications within 30 days of public launch to establish priority.

### Minor concerns

- **Code of conduct:** Adopt Contributor Covenant before opening GitHub to external contributors.
- **Security policy:** Create `SECURITY.md` with vulnerability disclosure process before beta.
