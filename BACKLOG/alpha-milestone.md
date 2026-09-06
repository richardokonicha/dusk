# Dusk Alpha Milestone

Date: 2026-09-06

## Current state — verified green gates

- Typecheck: pass (node/web/aicore under Node 26.5.0; authoritative CI must run Node 24.15.x)
- electron-vite production build: pass
- Focused Work OS suites: 233/233 (AgentWorkspace, AgentTask, AgentChannelWorkflow, FileEntry, Job, KnowledgeBase)
- i18n:pass (69,667 translations)
- docs:check: pass
- lint: 0 errors, 47 warnings
- Runtime smoke: dev runtime reaches main/renderer bundle completion with local binary setup

## Blocking the first commit

1. **Massive rename diff** (`packages/cherry` → `packages/dusk`, thousands of identifier/file changes). Strategy:
   - Stage and let Git rename-detection run: `git add -A` then inspect `git diff --cached --stat | head` and spot-rename checks.
   - Split into two commits if review ergonomics matter: (a) mechanical renames only, (b) functional edits (RegionService, AppUpdater gate, provider removal, OAuth TODOs, backlog/docs).
2. **CI warning gate**: `pnpm test:lint` denies the 47 existing warnings. Either (a) clean them, or (b) accept GitLab CI `test` job `allow_failure: true` for alpha (currently configured) and tighten post-alpha.
3. **Node version**: pin CI/`.nvmrc` to Node `24.15.x` to match `engines`. Local verification under Node 26 passes but should not be the release gate.
4. **Full `pnpm test`**: has not completed within a 30-min wall-clock window on this machine. Run once on CI (Node 24) as the authoritative result before tagging alpha.
5. **Signatures**: repo conventions require signed commits (`git commit -S --signoff`); confirm signing identity before committing.

## Visual review status

- Build/runtime: launchable; Electron main/renderer load.
- Native automation inspection: blocked on macOS Accessibility + Screen Recording permissions for the driver; not an app failure. Manual spot-check checklist:
  - [ ] App icon + name present in dock/about
  - [ ] Dark theme = dusk palette (violet brand, amber accent)
  - [ ] First-run flow: no Cherry branding anywhere, privacy panel reads correctly
  - [ ] Provider setup: full list, CherryAI absent, add OpenAI-compatible works
  - [ ] New chat works with a configured model
  - [ ] No update error toasts during a 10-minute idle
  - [ ] No outbound requests to cherry domains (network tab / little-snitch)

## Post-alpha vertical slice (the Work OS gap)

Smallest proof-of-product flow to build next, reusing existing services (no new storage engine):

1. Workspace entity = `agentWorkspace` (already exists) — add a dedicated "Workspaces" nav experience that lists/creates it and opens chat in its context.
2. Workspace chat = existing `AgentChat` with `session.workspaceId` set (already supported); the slice only adds UX focus.
3. Files = existing `FileEntryService` + drag-drop (exists); surface workspace-scoped files list in the side panel (`AgentRightPane` has workspace files already).
4. Task = `AgentTaskService` on top of job scheduler (exists); surface progress via `AgentTaskProgressCapsule` (exists).
5. Artifact = generated file under workspace path; render via existing artifact preview (`HtmlArtifactsCard`) and record a FileEntry (exists).
6. Activity feed = read-side composition of recent sessions + tasks + file changes.

No new database tables are required for the alpha slice; the gap is UI composition and routing defaults, not schema.

## Deferred (post-alpha)

- Mobile (Expo/RN fork later; desktop workspace contracts must stabilize first).
- Fugoku Gateway preset (config-only provider; add after workspace slice UX is stable).
- Assistant-preset curation (300+ inherited presets to curate).
- i18n native-speaker pass on zh translations (placeholders removed mechanically).
- `@cherrystudio/openai` alias removed in favor of upstream `openai` — verify provider behaviors against a matrix of models before shipping (patches/ compatibility).
