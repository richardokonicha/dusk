# Dusk 0.1.0-alpha.3 — Release Design

Date: 2026-10-08
Status: approved for execution

## 1. Summary

Land the `wip/provider-prune` work on `main` through a pull request, correct the
release documentation that contradicts the actual CI setup, and publish
`0.1.0-alpha.3` as a GitHub pre-release using the existing tag-push flow.

No CI workflow changes are required: both workflows already build macOS and
Windows.

## 2. Starting state

| Fact | Evidence |
| --- | --- |
| Branch is `wip/provider-prune`, not `main` | `git branch --show-current` |
| 7 commits ahead, 1 behind `origin/main` | `git rev-list --left-right --count origin/main...HEAD` → `1  7` |
| The 1 commit behind is absorbed | `fe7e88f8` and `b021c740` are byte-identical across their 5 shared paths; `fe7e88f8` additionally changes `.gitignore` and `packages/dusk/eslint.config.mjs`. Patch-ids differ (`0a981699` vs `a26f5dd2`), so the branch copy is a strict subset |
| All 6 pending commits are unsigned, no DCO trailer | `git log --format='%h G=%G? %s'` → `G=N`; empty `Signed-off-by` trailers |
| No GPG key on this machine | `gpg --list-secret-keys` empty; `user.signingkey` and `commit.gpgsign` unset |
| Working tree clean, 0 untracked files | `git status --short` empty; `git ls-files --others --exclude-standard` → 0 |
| CI already builds macOS + Windows | `ci.yml` job `build-desktop` matrix: `macos-14` × {arm64, x64}, `windows-latest` × {x64, arm64} |
| Release workflow builds 6 targets and publishes | `release.yml` matrix + `publish` job using `softprops/action-gh-release@v2`, `prerelease: true` |
| No signing secrets configured | `gh secret list` returns empty |
| Prior releases published the same way | `gh release list` → `v0.1.0-alpha.1`, `v0.1.0-alpha.2`, both Pre-release |
| Current release notes would fail the validator | `electron-builder.yml` has `<!--LANG:en-->` and `<!--LANG:END-->` but no `<!--LANG:zh-CN-->` |
| Docs baseline is green | `pnpm docs:check` passes across 291 markdown files |

Surviving provider gateways, from `packages/provider-registry/src/providers/`:

- **Kilo Gateway** — `id: kilo`, `https://api.kilo.ai/api/gateway`
- **Fugoku Gateway** — `id: fugoku`, `https://open.duskin.net/v1`

## 3. Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Commit signing | Proceed unsigned | Explicit user decision. Recorded as a deviation in §8 |
| Release mechanism | Tag-push | Proven by alpha.1 and alpha.2. `publish` has `needs: build`, so one failed matrix leg blocks publication — no partial releases |
| Landing on `main` | Pull request | CI runs the full macOS + Windows matrix on the PR, giving build proof before any tag exists |
| Root `package.json` version | Leave at `0.1.0-alpha.2` | The release validator resolves paths relative to `packages/dusk` and rejects any extra changed file, so the root manifest cannot be bumped in the release-prep commit. The root workspace is `private: true` and hosts only the VitePress docs; the shipped version comes from `packages/dusk/package.json`. The resulting skew is deliberate and recorded here |
| `wip:` commit subject | Reword to a conventional subject | `AGENTS.md` mandates conventional commits with a specific kebab-case scope |
| Gateway naming in release notes | Name both gateways explicitly | Users losing 60 providers need to know what remains. Vague phrasing would be worse than naming them |

## 4. Release metadata contract

`packages/dusk/scripts/release/validate-prepared-release.js` compares the
**working tree against `HEAD`** (tracked diff plus untracked files) and requires,
for a prerelease, exactly two changed paths:

- `packages/dusk/package.json` — the `version` field and nothing else
- `packages/dusk/electron-builder.yml` — `releaseInfo.releaseNotes` and nothing else

Release notes must contain one ordered set of the markers
`<!--LANG:en-->`, `<!--LANG:zh-CN-->`, `<!--LANG:END-->`, with both the English
and Chinese sections non-empty.

Two consequences that constrain execution:

- Every other change, including all documentation, must be committed **before**
  the release-prep edits are made.
- `dist/` and `out/` are gitignored and the tree has zero untracked files, so the
  validator sees only intentional edits.

Target version: `0.1.0-alpha.3`, which is greater than the current
`0.1.0-alpha.2`. Prerelease preparation must not touch
`resources/dusk/release-history.json`.

## 5. Execution steps

Each step lists its verification.

1. **Fetch and rebase.** `git fetch origin` then `git rebase origin/main`.
   `b021c740` becomes empty and is dropped.
   *Verify:* `git log --oneline origin/main..HEAD` lists exactly 6 commits and
   none is `b021c740`.

2. **Reword the `wip:` commit** to
   `refactor(provider-registry): prune registry to the supported gateways`.
   *Verify:* `git log --format=%s origin/main..HEAD` contains no `wip:` subject.

3. **Documentation commit** — §6, touching only `docs/devops-release.md` and
   `README.md`.
   *Verify:* `pnpm docs:check` passes.

4. **Release preparation.** Set `version` to `0.1.0-alpha.3` in
   `packages/dusk/package.json` and write the bilingual `releaseInfo.releaseNotes`
   in `packages/dusk/electron-builder.yml`.
   *Verify:*
   `cd packages/dusk && node scripts/release/validate-prepared-release.js --target-version 0.1.0-alpha.3`
   prints `Validated release metadata for 0.1.0-alpha.3`.

5. **Commit release preparation** as
   `chore(release): prepare 0.1.0-alpha.3`.
   *Verify:* `git show --stat HEAD` lists exactly the two files from §4.

6. **Push and open the PR** to `main`.
   *Verify:* PR is open against `main` with the 8 commits.

7. **Watch CI.** The `build-desktop` matrix must be green for
   `macos-arm64`, `macos-x64`, `windows-x64`, `windows-arm64`, alongside
   `lint-and-build` and `test`.
   *Verify:* `gh pr checks` all succeed. This is the proof that CI builds macOS
   and Windows.

8. **Merge to `main`.**
   *Verify:* `origin/main` contains the release-prep commit.

9. **Tag the merge commit** and push the tag.
   *Verify:* `git ls-remote --tags origin v0.1.0-alpha.3` resolves to the
   `origin/main` tip.

10. **Watch the release workflow** build all 6 targets and publish the
    pre-release.
    *Verify:* `gh run list --workflow release.yml` shows success, and
    `gh release view v0.1.0-alpha.3 --json assets` lists the expected set.

    The expected asset set is taken from `v0.1.0-alpha.2`, which shipped:

    | Target | Assets |
    | --- | --- |
    | macOS arm64 | `-mac-arm64.dmg`, `-mac-arm64.zip`, `-mac-arm64.zip.blockmap` |
    | macOS x64 | `-mac-x64.zip`, `-mac-x64.zip.blockmap` |
    | Windows x64 | `-win-x64-setup.exe`, `-win-x64-portable.exe` |
    | Windows arm64 | `-win-arm64-setup.exe`, `-win-arm64-portable.exe` |
    | Linux x64 / arm64 | `.AppImage`, `.deb`, `.rpm` per arch |
    | Metadata | `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml` |

    Note that alpha.2 shipped **no `mac-x64` DMG** — the `hdiutil` failure path in
    `release.yml` fell back to the zip target. That fallback is expected
    behaviour on the macOS runners, so a zip-only macOS x64 asset is a pass, not
    a regression.

## 6. Documentation changes

### `docs/devops-release.md`

Correct every point where it contradicts the repository:

| Section | Currently claims | Corrected to |
| --- | --- | --- |
| §1.1 | Two jobs, both `ubuntu-latest` | Three jobs, including the `build-desktop` matrix: `macos-14` for arm64 and x64, `windows-latest` for x64 and arm64 |
| §1.2 | Pipeline diagram ends at `pnpm test` | Add desktop packaging for macOS and Windows |
| §2.1 | Three runners using `build:mac`, `build:win`, `build:linux` | Six matrix entries using `build:mac:arm64`, `build:mac:x64`, `build:win:x64`, `build:win:arm64`, `build:linux:x64`, `build:linux:arm64` |
| §2.1 | Artifacts come from `packages/dusk/out` | Artifacts come from `packages/dusk/dist` |
| §2.1 | `hdiutil` retry and zip fallback absent | Document the retry, then the zip-target fallback |
| §2.1, §5 | Publishing disabled pending the `publish` block | `publish` job creates the release via `softprops/action-gh-release@v2` with `prerelease: true` and `generate_release_notes: true` |
| §4 | `WIN_SIGN` listed as a repository secret | `WIN_SIGN` is derived from `DUSK_CERT_PATH`; it is not a secret. Also record that no secrets are currently configured, so builds are unsigned and un-notarized |
| §2.2 | Release-note markers | Already correct; keep |

Additionally note that `scripts/release/validate-release-state.js` implements a
draft-release flow that `release.yml` does not use, so readers do not assume it
gates the release.

### `README.md`

- Line 11: current version → `0.1.0-alpha.3`
- Lines 89–90: tag example → `v0.1.0-alpha.3`

### Untouched

`BACKLOG/rebrand-pass-1.md` keeps its historical reference to alpha.2.

## 7. Verification gates

Run locally:

- `pnpm docs:check` — documentation edits
- `node scripts/release/validate-prepared-release.js --target-version 0.1.0-alpha.3`
  — release metadata

Rely on pull-request CI for the six pre-existing code commits, which is where the
full `lint` and `test` gate runs. No local full-suite run is required for
documentation and version changes.

## 8. Accepted deviations

1. **Commits are unsigned and lack DCO sign-off.** `AGENTS.md` requires both.
   GitHub will show no `Verified` badge. Follow-up: provision a GPG key, set
   `user.signingkey` and `commit.gpgsign`, then re-sign.
2. **Installers are unsigned and un-notarized.** No secrets are configured, so
   `scripts/notarize.js` returns early and `WIN_SIGN` is never set. Users will
   meet Gatekeeper and SmartScreen warnings. This matches alpha.1, alpha.2 and
   the release notes' "Unsigned builds".
3. **The `wip:` commit subject is rewritten**, and `b021c740` is dropped by the
   rebase. Both affect only unpushed history.
4. **Root `package.json` stays at `0.1.0-alpha.2`** while
   `packages/dusk/package.json` moves to `0.1.0-alpha.3`. Deliberate, per §3.

## 9. Out of scope

- Signing or notarization setup, including the Apple and Windows credentials
- Enabling the `publish` block in `electron-builder.yml`, or pointing
  auto-update at a release server
- Wiring `validate-release-state.js` into `release.yml`
- Any change to `ci.yml` or `release.yml`
- Provider registry, model catalog, or runtime behaviour
