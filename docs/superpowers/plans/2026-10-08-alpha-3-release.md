# Dusk 0.1.0-alpha.3 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the provider-registry prune on `main` via a pull request, correct the release documentation, and publish `0.1.0-alpha.3` as a GitHub pre-release.

**Architecture:** Eight sequential tasks. Tasks 1–3 are local git and file work that produce two commits; Tasks 4–8 are GitHub operations that carry the branch through PR, CI, merge, tag and release. Ordering is forced by `packages/dusk/scripts/release/validate-prepared-release.js`, which diffs the working tree against `HEAD` and rejects any release-preparation commit that touches a file other than `package.json` and `electron-builder.yml`.

**Tech Stack:** Git, GitHub CLI (`gh`), pnpm 11.28.1, Node 24.11.1 (nvm), electron-builder 26, electron-vite 7, VitePress docs.

## Global Constraints

- Node **24.11.1** only. `packages/dusk/.npmrc` sets `engine-strict=true` and `package.json` requires `>=24.11.1 <24.16.0`. Activate with `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.11.1`.
- Install and run all app scripts from **`packages/dusk`**, never the repo root. The `patchedDependencies` and workspace overrides live in `packages/dusk/pnpm-workspace.yaml`.
- Target version is exactly **`0.1.0-alpha.3`**. Current is `0.1.0-alpha.2`.
- Commits are **unsigned** (`git commit --signoff`, never `-S`; no GPG key exists on this machine). GitHub will show no `Verified` badge.
- Commit subjects follow Conventional Commits with a specific kebab-case scope. No `wip:` subjects.
- Release preparation may change **only** `packages/dusk/package.json` (the `version` field) and `packages/dusk/electron-builder.yml` (`releaseInfo.releaseNotes`). `resources/dusk/release-history.json` must stay untouched for a prerelease.
- Release notes must contain exactly one ordered set of `<!--LANG:en-->`, `<!--LANG:zh-CN-->`, `<!--LANG:END-->`, with both language sections non-empty.
- `dist/` and `out/` are gitignored. The working tree must have zero untracked files before release preparation.
- Do not modify `.github/workflows/ci.yml` or `.github/workflows/release.yml`.
- Do not modify the root `package.json` version; it stays at `0.1.0-alpha.2`.

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `docs/superpowers/specs/2026-10-08-alpha-3-release-design.md` | already committed (`cc2df60f`) | Approved design; not modified further |
| `docs/devops-release.md` | Modify | Single source of truth for CI and release setup; currently contradicts the workflows in seven places |
| `README.md` | Modify | Public alpha status and release instructions |
| `packages/dusk/package.json` | Modify | Shipped app version → `0.1.0-alpha.3` |
| `packages/dusk/electron-builder.yml` | Modify | `releaseInfo.releaseNotes` only |

No test files are added or changed. This plan alters documentation and release metadata only; the six pre-existing code commits are gated by pull-request CI, which runs the full `lint` and `test` suites.

---

### Task 1: Rebase onto main and reword the `wip:` commit

**Files:**
- Modify: none on disk — git history only

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: a branch whose `origin/main..HEAD` range holds 6 commits, none of them `b021c740`, and no `wip:` subject. Every later task assumes this shape.

`origin/main` already contains `fe7e88f8`, which is byte-identical to the branch's `b021c740` across its five shared paths and additionally modifies `.gitignore` and `packages/dusk/eslint.config.mjs`. The branch copy is therefore a strict subset and is dropped.

- [ ] **Step 1: Activate the pinned Node and confirm the starting shape**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24.11.1
cd /Users/ro/Fugoku/DUSK
node -v
git branch --show-current
git log --oneline origin/main..HEAD
```

Expected: `v24.11.1`, branch `wip/provider-prune`, and 8 commits listed (7 pre-existing plus the spec commit `cc2df60f`).

- [ ] **Step 2: Fetch and rebase**

```bash
git fetch origin
git rebase origin/main
```

Expected: `b021c740` is dropped as already-applied.

- [ ] **Step 3: If the rebase pauses instead of dropping the commit, skip it**

The change is already upstream, so an empty result is the correct outcome:

```bash
git rebase --skip
git rebase --continue
```

- [ ] **Step 4: Verify the absorbed commit is gone**

```bash
git log --oneline origin/main..HEAD
git log --oneline origin/main..HEAD | grep -c b021c740
```

Expected: 7 commits listed; the `grep -c` prints `0`.

- [ ] **Step 5: Confirm the absorbed change survived rather than being reverted**

After the rebase the branch descends from `origin/main`, so main's version of every
shared file — including the two that only main touched — must be carried unchanged.
Both diffs must be **empty**:

```bash
git diff --stat origin/main HEAD -- packages/provider-registry/scripts/generate-catalog.ts
git diff --stat origin/main HEAD -- .gitignore packages/dusk/eslint.config.mjs
```

Expected: no output from either command. A non-empty second diff would mean the
replay reverted main's `.gitignore` and `eslint.config.mjs` edits.

- [ ] **Step 6: Reword the `wip:` commit**

The oldest commit in the range is the `wip:` one. Amend it in place, then replay everything after it:

```bash
cd /Users/ro/Fugoku/DUSK
OLDEST=$(git rev-list --reverse origin/main..HEAD | head -1)
git log -1 --format=%s "$OLDEST"
```

Expected: `wip: prune provider registry to Kilo and Fugoku gateways`.

```bash
git checkout --detach "$OLDEST"
git commit --amend --signoff -m "refactor(provider-registry): prune registry to the supported gateways"
NEWEST=$(git rev-parse HEAD)
git checkout wip/provider-prune
git rebase --onto "$NEWEST" "$OLDEST"
```

- [ ] **Step 7: Verify the reword and the branch shape**

```bash
git branch --show-current
git log --format=%s origin/main..HEAD
git status --short
```

Expected: on `wip/provider-prune`; no subject starts with `wip:`; `git status --short` prints nothing.

- [ ] **Step 8: Leave the branch unpushed**

Do not push yet — Tasks 2 and 3 add the two commits that the pull request will carry.

---

### Task 2: Correct `docs/devops-release.md`

**Files:**
- Modify: `docs/devops-release.md` (§1.1, §1.2, §2.1, §4, plus a new note in §2.2)

**Interfaces:**
- Consumes: the branch shape from Task 1
- Produces: documentation matching `.github/workflows/ci.yml` and `release.yml`. Task 4 relies on this being the only documentation change in the release-preparation commit's history.

The file currently misdescribes CI, the release matrix, the artifact directory, publishing, and the secrets table.

- [ ] **Step 1: Replace §1.1 with the three-job description**

Replace the body under the `### 1.1` heading, keeping the `pnpm lint` paragraph that already follows the table:

```markdown
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
```

- [ ] **Step 2: Extend the §1.2 pipeline diagram with desktop packaging**

Replace the diagram block with:

```markdown
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
```

- [ ] **Step 3: Replace §2.1 with the six-entry matrix and real publishing**

Replace the whole of §2.1 up to (but not including) the `### 2.2` heading:

```markdown
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
```

- [ ] **Step 4: Note the unused draft-release validator in §2.2**

Append to the `### 2.2` list:

```markdown
- `scripts/release/validate-release-state.js` implements a draft-release flow
  (draft release, `workflow_dispatch`, branch/tag/SHA equality, manual publish
  gate). `release.yml` does **not** call it; the tag-push flow above is what runs.
```

- [ ] **Step 5: Correct the §4 secrets table**

Replace the `WIN_SIGN` table row, and add a status paragraph after the table:

```markdown
| `DUSK_CERT_CSP` | Windows signing CSP |
| `WIN_SIGN_TIMESTAMP_URLS` | Comma-separated timestamp URLs (optional) |

`WIN_SIGN` is deliberately absent from this table: the workflow derives it from
`DUSK_CERT_PATH` rather than reading it from the repository.

**Current status: no secrets are configured** (`gh secret list` returns empty).
macOS notarization is therefore skipped — `scripts/notarize.js` returns early
without `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` — and
Windows installers are unsigned. Every published alpha is unsigned, so users meet
Gatekeeper and SmartScreen warnings on first launch.
```

- [ ] **Step 6: Correct §5 distribution channels**

Replace the GitHub Releases bullet:

```markdown
- **GitHub Releases** — primary distribution channel. The `publish` job in
  `release.yml` creates a pre-release automatically on every `v*` tag.
- Assets: DMG/zip (mac), setup + portable EXE (win), AppImage/deb/rpm (linux).
- A macOS x64 entry may ship zip-only: the `hdiutil` fallback in `release.yml`
  replaces the DMG when volume creation fails on the runner. `v0.1.0-alpha.2`
  shipped this way.
```

- [ ] **Step 7: Run the docs gate**

```bash
cd /Users/ro/Fugoku/DUSK/packages/dusk
pnpm docs:check
```

Expected: `All links are valid.`, `Docs structure OK.`, `Doc frontmatter OK.`, `Docs index OK.`

- [ ] **Step 8: Commit the documentation**

```bash
cd /Users/ro/Fugoku/DUSK
git add docs/devops-release.md README.md
git commit --signoff -m "docs(devops-release): correct CI matrix, artifacts and publishing"
```

`README.md` is staged here as well because Task 3 updates it in the same commit.

---

### Task 3: Update `README.md` version and release instructions

**Files:**
- Modify: `README.md:11` and `README.md:89-90`

**Interfaces:**
- Consumes: Task 1's branch shape
- Produces: public docs stating `0.1.0-alpha.3`. Committed together with Task 2's file so the documentation lands as one commit before release preparation.

- [ ] **Step 1: Update the alpha status line**

Change line 11 from:

```markdown
Dusk is in alpha. Current version: `0.1.0-alpha.2`.
```

to:

```markdown
Dusk is in alpha. Current version: `0.1.0-alpha.3`.
```

- [ ] **Step 2: Update the tag example**

Change the release snippet from:

```bash
git tag v0.1.0-alpha.2
git push origin v0.1.0-alpha.2
```

to:

```bash
git tag v0.1.0-alpha.3
git push origin v0.1.0-alpha.3
```

- [ ] **Step 3: Leave the unsigned-build notice alone**

Line 15 already states that alpha builds are unsigned and that Gatekeeper and
SmartScreen warn on first launch. That is accurate — no secrets are configured —
so do not edit it.

- [ ] **Step 4: Confirm no stale alpha.2 references remain outside history**

```bash
cd /Users/ro/Fugoku/DUSK
grep -rn "alpha\.2" README.md docs/devops-release.md
```

Expected: no output.

`BACKLOG/rebrand-pass-1.md` also mentions alpha.2. That is a historical record and
stays untouched; exclude it from this check.

- [ ] **Step 5: Commit with Task 2's file**

If Task 2's Step 8 has not already been run, stage both files and commit:

```bash
cd /Users/ro/Fugoku/DUSK
git add docs/devops-release.md README.md
git commit --signoff -m "docs(devops-release): correct CI matrix, artifacts and publishing"
```

- [ ] **Step 6: Verify the documentation commit is clean**

```bash
git show --stat HEAD
git status --short
```

Expected: exactly two files, `docs/devops-release.md` and `README.md`; clean status.

---

### Task 4: Prepare the release metadata

**Files:**
- Modify: `packages/dusk/package.json` (`version` only)
- Modify: `packages/dusk/electron-builder.yml` (`releaseInfo.releaseNotes` only)

**Interfaces:**
- Consumes: a clean working tree with all documentation already committed (Tasks 2 and 3)
- Produces: a validated release-preparation commit. Task 5 pushes it; Task 8's tag must point at it after the merge.

`validate-prepared-release.js` diffs the working tree against `HEAD` and requires exactly `electron-builder.yml` and `package.json` — resolved relative to `packages/dusk`. Any other modified or untracked file fails the check, which is why Tasks 2 and 3 must be committed first.

- [ ] **Step 1: Confirm the working tree is clean before editing**

```bash
cd /Users/ro/Fugoku/DUSK
git status --short
git ls-files --others --exclude-standard | wc -l
```

Expected: no output, and `0`.

- [ ] **Step 2: Bump the shipped version**

In `packages/dusk/package.json`, change:

```json
"version": "0.1.0-alpha.2",
```

to:

```json
"version": "0.1.0-alpha.3",
```

Change no other field. Do not touch the root `package.json`.

- [ ] **Step 3: Write the bilingual release notes**

In `packages/dusk/electron-builder.yml`, replace the whole `releaseNotes: |` block
so it reads exactly:

```yaml
releaseInfo:
  releaseNotes: |
    <!--LANG:en-->
    Dusk 0.1.0-alpha.3 — provider registry consolidation and packaging fixes.

    The provider registry is pruned to the two supported OpenAI-compatible
    gateways: Kilo Gateway and Fugoku Gateway. Providers removed from the
    registry take their test fixtures and server-tool delivery entries with them.
    Vendored upstream model snapshots are no longer bundled into the app package,
    and reasoning-family rules are corrected for newly upstreamed SKUs.
    Unsigned builds.
    <!--LANG:zh-CN-->
    Dusk 0.1.0-alpha.3 —— 提供商注册表整合与打包修复。

    提供商注册表精简为两个受支持的 OpenAI 兼容网关：Kilo Gateway 与 Fugoku Gateway。
    从注册表中移除的提供商，其测试夹具与服务端工具投递条目一并清除。应用安装包不再
    包含内置的上游模型快照，并修正了新上游 SKU 的推理系列规则。构建未签名。
    <!--LANG:END-->
```

- [ ] **Step 4: Validate the prepared release**

```bash
cd /Users/ro/Fugoku/DUSK/packages/dusk
node scripts/release/validate-prepared-release.js --target-version 0.1.0-alpha.3
```

Expected: `Validated release metadata for 0.1.0-alpha.3`

- [ ] **Step 5: If validation fails, diagnose before changing anything**

`Release preparation changed an unexpected set of source files` means a third file
is modified or untracked — re-run `git status --short` and `git ls-files --others
--exclude-standard` from the repo root and commit or remove the extra path.

`Release notes must contain one ordered set of bilingual markers` means a marker is
missing or duplicated — confirm all three appear exactly once, in order.

- [ ] **Step 6: Confirm only two files changed**

```bash
cd /Users/ro/Fugoku/DUSK
git status --short
```

Expected: exactly `packages/dusk/package.json` and `packages/dusk/electron-builder.yml`.

- [ ] **Step 7: Commit the release preparation**

```bash
git add packages/dusk/package.json packages/dusk/electron-builder.yml
git commit --signoff -m "chore(release): prepare 0.1.0-alpha.3"
```

- [ ] **Step 8: Verify the committed release metadata directly**

The validator only inspects an uncommitted working tree, so verify the commit's
contents instead of re-running it:

```bash
cd /Users/ro/Fugoku/DUSK
git show --stat HEAD
git show HEAD:packages/dusk/package.json | grep '"version"'
git show HEAD:packages/dusk/electron-builder.yml | grep -c "LANG:"
git show HEAD:resources/dusk/release-history.json 2>/dev/null || git show HEAD:packages/dusk/resources/dusk/release-history.json | head -3
```

Expected: `git show --stat` lists exactly `packages/dusk/package.json` and
`packages/dusk/electron-builder.yml`; the version reads `0.1.0-alpha.3`; the marker
count is `3`; and the release history is unchanged from `origin/main`.

---

### Task 5: Push the branch and open the pull request

**Files:**
- None on disk

**Interfaces:**
- Consumes: the two commits from Tasks 2/3 and Task 4
- Produces: an open PR against `main`. Task 6 gates on it.

`packages/dusk/AGENTS.md` mandates the `gh-create-pr` skill for pull requests. Use it; fall back to `.agents/skills/gh-create-pr/SKILL.md` if the skill is unavailable.

- [ ] **Step 1: Confirm the full commit list**

```bash
cd /Users/ro/Fugoku/DUSK
git log --oneline origin/main..HEAD
git status --short
```

Expected: 9 commits — the 6 rebased code commits, `cc2df60f` (design spec), the documentation commit, and `chore(release): prepare 0.1.0-alpha.3`. Clean status.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin wip/provider-prune
```

- [ ] **Step 3: Open the PR with the gh-create-pr skill**

Title: `chore(release): prune provider registry to the supported gateways and prepare 0.1.0-alpha.3`

Body must cover: the provider registry prune to Kilo Gateway and Fugoku Gateway with fixtures and server-tool entries removed; vendored upstream snapshots excluded from the bundle; reasoning-family rule fix; the `docs/devops-release.md` corrections; and the `0.1.0-alpha.3` version bump with bilingual release notes. Note explicitly that commits are unsigned and that macOS/Windows builds ship unsigned and un-notarized because no secrets are configured.

- [ ] **Step 4: Verify the PR**

```bash
gh pr view --json number,title,baseRefName,headRefName,state
```

Expected: `baseRefName` is `main`, `headRefName` is `wip/provider-prune`, `state` is `OPEN`.

---

### Task 6: Gate on green CI

**Files:**
- None on disk

**Interfaces:**
- Consumes: the PR from Task 5
- Produces: proof that CI builds macOS and Windows. Task 7 merges only on success.

- [ ] **Step 1: Watch all checks**

```bash
gh pr checks --watch --interval 30
```

Expected: every check succeeds — `lint-and-build`, `test`, and all four `Desktop build` entries (`macos-arm64`, `macos-x64`, `windows-x64`, `windows-arm64`).

- [ ] **Step 2: Confirm the macOS and Windows legs specifically**

```bash
gh pr checks
```

Expected: the four `Desktop build` rows are present and successful. If `macos-x64` succeeds with only a zip artifact, that is the `hdiutil` fallback working as designed, not a failure.

- [ ] **Step 3: Stop and report if anything is red**

Do not merge a red build. Report the failing job and its log to the user.

---

### Task 7: Merge to `main`

**Files:**
- None on disk

**Interfaces:**
- Consumes: green CI from Task 6
- Produces: `origin/main` containing the release-preparation commit. Task 8 tags the merge commit.

- [ ] **Step 1: Merge**

```bash
gh pr merge --squash --delete-branch=false
```

Use squash so `main` receives one commit for the release. Keep the branch — Task 8's verification needs to compare it against `origin/main`.

- [ ] **Step 2: Sync local main and confirm the release commit landed**

```bash
cd /Users/ro/Fugoku/DUSK
git fetch origin
git log --oneline origin/main -3
git show origin/main:packages/dusk/package.json | grep '"version"'
```

Expected: the tip is the squash commit and the version reads `0.1.0-alpha.3`.

---

### Task 8: Tag and verify the published release

**Files:**
- None on disk

**Interfaces:**
- Consumes: `origin/main` from Task 7
- Produces: published pre-release `v0.1.0-alpha.3` with all target artifacts

- [ ] **Step 1: Create the tag on the merge commit**

```bash
cd /Users/ro/Fugoku/DUSK
git checkout main
git pull --ff-only origin main
git tag v0.1.0-alpha.3
git push origin v0.1.0-alpha.3
```

- [ ] **Step 2: Verify the tag resolves to the `main` tip**

```bash
git ls-remote --tags origin v0.1.0-alpha.3
git rev-parse origin/main
```

Expected: both SHAs match.

- [ ] **Step 3: Watch the release workflow**

```bash
gh run list --workflow release.yml --limit 1
gh run watch
```

Expected: the run succeeds across all six matrix entries, then the `publish` job creates the release.

- [ ] **Step 4: Verify the published assets**

```bash
gh release view v0.1.0-alpha.3 --json assets,isPrerelease --jq '{prerelease: .isPrerelease, assets: [.assets[].name]}'
```

Expected assets, matching what `v0.1.0-alpha.2` shipped:

| Target | Assets |
| --- | --- |
| macOS arm64 | `-mac-arm64.dmg`, `-mac-arm64.zip`, `-mac-arm64.zip.blockmap` |
| macOS x64 | `-mac-x64.zip`, `-mac-x64.zip.blockmap` |
| Windows x64 | `-win-x64-setup.exe`, `-win-x64-portable.exe` |
| Windows arm64 | `-win-arm64-setup.exe`, `-win-arm64-portable.exe` |
| Linux x64 / arm64 | `.AppImage`, `.deb`, `.rpm` per arch |
| Metadata | `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml` |

`isPrerelease` must be `true`. A zip-only macOS x64 entry is expected — the `hdiutil` fallback produced exactly that for alpha.2.

- [ ] **Step 5: Confirm the remote state is clean**

```bash
cd /Users/ro/Fugoku/DUSK
git checkout wip/provider-prune
git status --short
```

Expected: clean status, on `wip/provider-prune`.

---

## Out of Scope

- Provisioning a GPG key or re-signing the existing commits
- Configuring `APPLE_ID`, `APPLE_TEAM_ID`, `CSC_LINK`, `DUSK_CERT_*` so builds become signed and notarized
- Enabling the `publish` block in `electron-builder.yml` or pointing auto-update at a release server
- Wiring `scripts/release/validate-release-state.js` into `release.yml`
- Editing `.github/workflows/ci.yml` or `.github/workflows/release.yml`
- Bumping the root `package.json` version
- Any change to the provider registry, model catalog, or runtime behaviour
