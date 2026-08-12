# Test Strategy Review — Dusk Work OS

## Executive Summary

The Dusk testing strategy is **comprehensive on paper** but suffers from **specification gaps, CI/implementation mismatches, and missing enforcement mechanisms**. The document sets ambitious coverage targets (70–95% per layer) and a multi-layer test pyramid (unit → component → integration → E2E), but the CI pipeline descriptions are inconsistent across documents, key test configurations are referenced but never defined, and the quality-gate job is a no-op. Cherry Studio's reference codebase demonstrates several patterns Dusk should adopt — notably per-process Vitest projects with correct `pool` selection for native modules, a real SQLite test-database harness with production migrations, and path-filtered/sharded CI — to avoid the very pitfalls Dusk's spec walks into.

---

## 1. Test Coverage — Critical Paths

### What's Covered Well

Dusk identifies 10 critical paths (§4.1) and maps them to layer-specific coverage targets (§4.2). The critical flows list (§1.3) is strong: install→launch→workspace→chat→agent→artifact, provider config→stream→stop, file import→storage→read→artifact output, multi-agent orchestration, and provider failover. Coverage targets by layer are also well-defined: IPC handlers 95%, agent runtime 90%, provider adapters 90%, DB layer 85%.

### What's Missing / At Risk

**Coverage thresholds are not enforced.** The `vitest.config.ts` (§3.1) defines a **single global threshold of 70%** for all metrics:

```ts
thresholds: {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
}
```

This conflicts with the per-layer targets in §1.3 and §4.2, which range from 70% to 95%. The global config does not enforce per-layer thresholds (Vitest supports `thresholds.perFile` or `thresholds.autoIncrementing`), so reaching 70% globally on a low-coverage file would pass CI even if IPC handlers or provider adapters fall far below their 90–95% targets. **No per-file or per-directory coverage thresholds are configured.**

**Excluded files are too broad.** The coverage exclude list in `vitest.config.ts` (line 400–402) excludes:

```ts
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.d.ts',
  'tests/**',
  'src/main/main.ts',
  'src/preload/**',
],
```

`src/main/main.ts` and `src/preload/**` are excluded from coverage. The main entry point (where the service container is initialized, window is created, and IPC handlers are registered) contains critical integration logic that should be tested, not excluded. The preload script bridges main↔renderer and is part of the IPC security boundary — excluding it means **the most security-critical code path has zero test coverage by design**.

**Agent runtime and multi-agent orchestration lack test guidance.** The agent state machine (§4 of `agent-system.md`) has 8 states with explicit transitions, but the testing strategy only shows single-step tool execution tests. There are no tests prescribed for:
- State transition validation (e.g., `ACTIVE → WORKING → FAILED → IDLE` on error)
- Max iteration limits and loop detection
- Memory loading/saving persistence across runs
- Artifact chain handoff between orchestrator → specialist → reviewer
- Multi-agent workflow `WorkflowExecutor` step chaining (the `workflow.steps.indexOf(step) - 1` indexing bug in `agent-system.md` line 556 is a prime candidate for an integration test)

**Provider failover has no unit-level test.** Critical path #8 (offline/online provider failover, §1.3) is listed as an E2E concern, but no unit test pattern exists for failover logic. Failover is a **service-level concern** (in `ProviderService`) that should have dedicated unit tests with mocked provider failure injection, not just E2E validation.

---

## 2. Test Types — Pyramid and Mix

### Assessment

The test pyramid (§2.1) is conceptually correct: unit at the base, component above, integration in the middle, E2E at the top. The four declared test types are:

1. **Unit tests (Vitest)** — well-scoped to pure functions, adapters, DB query builders, agent runtime logic
2. **Component tests (Testing Library)** — well-scoped to React components
3. **Integration tests** — IPC channels, service wiring, DB operations, provider round-trips (mocked), agent runtime with tool execution
4. **E2E tests (Playwright)** — cross-process user journeys

### Gaps in Test Type Coverage

**No dedicated performance/benchmark tests.** Dusk defines performance budgets (§1.4) but has no test type for them:
- Cold start ≤ 3s — measured by Playwright E2E, but E2E runs on CI are inherently slow and non-deterministic
- IPC round-trip ≤ 50ms — described as "Integration test" but no integration test pattern measures latency
- Agent tool call ≤ 500ms — same gap

Cherry's `vitest.config.ts` separates benchmark tests with `include: ['**/*.bench.{ts,tsx}']` and uses `vitest bench` CI jobs. Dusk should adopt a similar pattern — Vitest benchmarks for latency budgets (IPC, DB queries) and Playwright measurements for app-level budgets (cold start, memory).

**No security-focused tests.** Cherry's test suite includes `validateSender.test.ts` (IPC sender validation, file:// traversal rejection, SSRF prevention). Dusk has no equivalent. The preload script (`src/preload/index.ts`) exposes `fs.readFile`/`fs.writeFile` through IPC — this security boundary has **zero test coverage specified**.

**No contract/schema validation tests for IPC.** The strategy mentions Zod validation (§3.5, §5.3) but the test patterns show validation only at the schema-loading level (checking all channels have input/output schemas) — **not at the runtime enforcement level**. No test simulates a malformed IPC message and asserts the handler rejects it with `ZodError`.

**No fuzzing or property-based testing.** Provider adapters and data transformers (normalizing OpenAI/Anthropic/Gemini responses) are prime candidates for property-based testing with `fast-check`. Cherry's `provider-registry` tests cover invariant checking extensively; Dusk covers none of this.

**Visual regression tests are under-specified.** The config (§2.6) defines a `visual-tests` project with `maxDiffPixels: 100` and `threshold: 0.2`, but there are no baseline files, no approval workflow, and no mention of how to update baselines in CI. A threshold of 0.2 is very aggressive (20% pixel diff allowed) — this will mask real UI regressions.

---

## 3. CI Integration — Will Tests Actually Run?

### Critical Finding: Three Conflicting CI Specs

The Dusk documentation describes **three different CI pipelines** across three files:

| Document | CI Workflow | Jobs | Key Difference |
|----------|------------|------|----------------|
| `devops-release.md` | `ci.yml` | lint, typecheck, test, build | Simplest; `pnpm test` runs everything |
| `testing-strategy.md` | `quality.yml` | lint-and-typecheck, unit-and-component, integration, e2E, dependency-audit, bundle-size, quality-gate | Most detailed; has branch protection |
| `testing-strategy.md` §8.1 | Release pipeline | e2e (all 3 OS), accessibility-audit, performance-benchmark, build, signed-artifacts | Release-only |

**The `quality.yml` pipeline references files and configs that don't exist in the spec:**

- `pnpm vitest run --config vitest.integration.config.ts` — **No `vitest.integration.config.ts` file is defined or described anywhere** in the documentation. This means the integration test job will fail with "config file not found."
- `pnpm electron-builder --dir` + `pnpm playwright test` in the E2E job — The Playwright config (§3.2) uses `@playwright/test` with `electron.launch({ args: ['.'] })`, but `electron-builder --dir` produces an **unpackaged directory**, not a runnable Electron app. Playwright's `electron.launch` needs a built app directory or `--main` path. **The E2E tests will fail to launch.**

**E2E cross-platform matrix issues:**

- The E2E job runs on `[ubuntu-latest, macos-latest, windows-latest]` with `pnpm electron-builder --dir` — this builds for each platform, but the resulting build is unpacked to `packages/desktop/dist/` which won't be in the expected location for Playwright's Electron launch.
- `playwright-electron` (mentioned in §2.5) is not a real package — the correct package is `@playwright/test`'s built-in Electron support. The E2E fixture pattern shows `electronApp.launch({ args: ['.'] })` but this needs the app to be built first.

**Quality gate is a no-op (line 547-551):**
```yaml
quality-gate:
  needs: [lint-and-typecheck, unit-and-component, integration, e2e, dependency-audit, bundle-size]
  runs-on: ubuntu-latest
  steps:
    - run: echo "All quality checks passed"
```

This job passes regardless of whether any checks actually passed — it only runs if its dependencies succeed, but it doesn't verify anything itself. **It is literally just a print statement.** No coverage threshold check, no bug count check, no release-readiness criteria enforced.

**Branch protection mismatch:** §8.2 lists `required_status_checks` contexts but the actual CI workflow files (`ci.yml`, `quality.yml`) have job names that may not exactly match these context strings. The `ci.yml` in `devops-release.md` uses job names `lint`, `typecheck`, `test`, `build` — but the branch protection references `lint-and-typecheck`, `unit-and-component`, `integration`, `dependency-audit` (matching `quality.yml` naming). **There is no guarantee the CI file described actually exists in the repo.**

### Cherry's Approach (for comparison)

Cherry's CI (`ci.yml`):
- Uses **path filtering** (`dorny/paths-filter@v4`) to determine which packages changed and only runs affected tests
- **Shards tests** — main tests across 3 shards, renderer across 5 shards
- Uses `pnpm rebuild:node` before tests to handle better-sqlite3 ABI
- Has **distinct test projects** in Vitest config, each with correct `environment` setting
- CI enforces `pnpm db:migrations:check` and `pnpm db:migrations:generate` to catch schema drift

---

## 4. Quality Gates — Are Release Criteria Realistic?

### Assessment: Overly Stringent with Missing Enforcement

**§1.1 Definition of Ready** lists 11 criteria. Several are **not automatable as CI gates** and will cause perpetual release blocks:

| Criterion | Automatable? | Assessment |
|-----------|-------------|------------|
| All automated tests pass | ✅ | Yes, standard |
| No P0 or P1 bugs open | ✅ | Can be enforced via GitHub API |
| No P2 bugs older than 7 days without owner | ❌ | Manual process, not a CI gate |
| TypeScript strict compiles with zero errors | ✅ | Yes |
| Lint passes with zero warnings | ⚠️ | Very hard to maintain; Biome config shows `recommended` rules but "zero warnings" is unrealistic at scale |
| Bundle size within budget | ✅ | Can be enforced with size-limit or bundle analysis |
| Test coverage meets minimum thresholds | ⚠️ | Thresholds not properly configured (see §1 above) |
| Accessibility audit ≥ 90% on critical flows | ⚠️ | Only runs on release, not per-PR; `@axe-core/playwright` requires app to be running |
| Manual smoke test on macOS, Windows, Linux | ❌ | Cannot be automated; will be skipped |
| Release notes drafted and reviewed | ❌ | Manual process |

**Cherry's approach:** Cherry enforces lint (`oxlint --deny-warnings`), typecheck, and tests in CI, but does **not** require zero lint warnings or manual smoke tests as PR gates. Cherry's `build:check` script runs `pnpm lint && pnpm docs:check-links && pnpm test` — all automated, no manual steps.

**Specific issues:**

- "Lint passes with zero warnings" — Biome's `check` command (line 467 in `quality.yml`) runs `pnpm biome check .` which includes formatting checks. On a growing codebase, maintaining zero warnings is a **drag on velocity**. Cherry uses `oxlint --deny-warnings` which is stricter but scoped to lint rules, not formatting.
- "No P2 bugs older than 7 days" — This is a **process requirement**, not a technical gate. Including it in "Definition of Ready for Release" conflates issue triage SLAs with technical quality gates.
- Coverage enforcement is absent from CI — no job reads the coverage report and fails the pipeline on threshold violations.

---

## 5. Cherry Comparison — Testing Patterns to Adopt

### 5.1 Vitest Multi-Project Configuration

Cherry's `vitest.config.ts` defines **6 Vitest projects** in a single config:
- `main` — `environment: 'node'`, `pool: 'forks'` (for native module safety)
- `renderer` — `environment: 'jsdom'`
- `scripts` — `environment: 'node'`
- `aiCore` — extends package-level config
- `shared` — `environment: 'node'`
- `provider-registry` — `environment: 'node'`
- `ui` — `environment: 'node'` (UI package scripts don't need jsdom)

**Why this matters for Dusk:** Dusk's strategy mentions a single `vitest.config.ts` and a separate `vitest.integration.config.ts` (that's never defined). Cherry's approach of **project-level separation with environment-specific configuration** is cleaner — no second config file needed, and each test type gets its correct environment automatically.

**Adopt:** Consolidate into a single multi-project Vitest config with projects for `main`, `renderer`, `integration`, and `ui`. Drop the nonexistent `vitest.integration.config.ts`.

### 5.2 Native Module ABI Handling

Cherry explicitly handles the **better-sqlite3 ABI split** between Node (tests) and Electron (app):
- `pnpm rebuild:node` — rebuilds for Node ABI before tests
- `pnpm rebuild:electron` — rebuilds for Electron ABI before app dev/build
- `vitest.config.ts` uses `pool: 'forks'` for the `main` project because better-sqlite3 (NAN/V8 native addon) is **not safe under `worker_threads`** (causes SIGSEGV at thread teardown)
- Pre-test hook (`pretest: pnpm rebuild:node`) runs automatically

**Dusk's gap:** Dusk's `devops-release.md` (line 173) shows `pnpm add better-sqlite3` in the desktop package, and `backend-architecture.md` uses Drizzle ORM + better-sqlite3. But there is **no mention of ABI handling in the testing strategy**. The integration tests that use `better-sqlite3` in-memory databases (§3.5, §3.2 pattern) will silently fail or crash on CI.

**Adopt:** Add `pnpm rebuild:node` as a pretest step, use `pool: 'forks'` for main-process tests, and document the ABI flip clearly.

### 5.3 Real SQLite Test Database Harness

Cherry's `setupTestDatabase()`:
- Creates a **file-backed** SQLite DB in `os.tmpdir()` (not `:memory:`, which Dusk proposes)
- Runs **production migrations** (not hand-written `CREATE TABLE` SQL)
- Sets `foreign_keys = ON` and `integrity_check = ok` as sanity assertions
- **Routes production code transparently** to the test DB via `MockMainDbServiceUtils.setDb()` — no per-test `vi.mock('@application')` overrides
- **Truncates all tables before each test** (not drops) for isolation
- Refuses nested setup calls with a clear error

Dusk's pattern (§3.2, §3.5) uses `:memory:` databases and hand-written `CREATE TABLE` SQL via a `migrate(db)` function. This **drifts silently** from production schema.

**Adopt:** Replace `:memory:` + hand-written SQL with the real-migration harness pattern. Use file-backed SQLite (not `:memory:`) to avoid connection-scoped state issues.

### 5.4 Test Mocking Discipline

Cherry's `main.setup.ts`:
- Mocks `@application`, `@logger`, `PreferenceService`, `DataApiService`, `CacheService`, `DbService` **globally** with a unified factory
- Mocks `electron` module with typed stubs (`app.getPath`, `ipcMain`, `BrowserWindow`, `dialog`, `shell`, `session`, etc.)
- **Keeps `node:fs`, `node:path`, `node:os` real** — only stubs `os.homedir()` to a deterministic path
- Comments explain why each mock exists

Dusk's strategy (§3.5) proposes ad-hoc mocks with `vi.mock('fs/promises', ...)` per test file and `memfs` for filesystem tests. This is **less maintainable** — each test file reinvents the wheel.

**Adopt:** Create a unified `tests/main.setup.ts` and `tests/renderer.setup.ts` with global mocks, following Cherry's pattern. Never stub `node:fs` globally — spy on specific methods when needed.

### 5.5 Path-Filtered, Sharded CI

Cherry's CI:
- Uses `dorny/paths-filter` to determine which of 7 subsystems changed
- **Conditionally runs tests** only for affected packages (e.g., `if: needs.changes.outputs.renderer == 'true'`)
- **Shards** main tests across 3 parallel runners, renderer across 5
- Has a `general-test` gate job that verifies shard results

Dusk's CI runs **all tests unconditionally** on every PR — will become slow as the codebase grows.

**Adopt:** Add path-filtering to CI. Add test sharding for the main and renderer suites.

### 5.6 Test Value Gate

Cherry's frontend-testing guide (lines 20–31) introduces a **Value Gate** — a test is only worth adding when:
1. It protects user-visible behavior or a documented contract
2. A realistic production regression would make it fail
3. It's not already covered at a more appropriate layer
4. It survives a behavior-preserving refactor

Dusk has no such gating principle. This leads to **low-value tests** that record current behavior rather than protect contracts.

**Adopt:** Adopt the Value Gate as a review principle for test additions.

### 5.7 E2E Testing Reality Check

Cherry has **only 1 E2E spec** (`app-launch.spec.ts`, 18 lines) — it checks window size on launch. This is honest: E2E tests for Electron apps on CI are expensive, flaky, and platform-dependent. Dusk's strategy prescribes extensive E2E coverage (§1.3 critical flows list has 5 flow groups) and a 3-OS matrix with 20-minute estimated runtime. **Cherry demonstrates that 5 critical E2E flows are enough.**

**Adopt:** Follow Cherry's "minimal E2E" philosophy — E2E is for cross-process workflow confidence, not feature coverage. Most logic should be in unit/integration tests.

---

## 6. Gaps — What's Missing from the Testing Strategy

### 6.1 Infrastructure Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| `vitest.integration.config.ts` referenced but never defined | Integration tests won't run in CI | **P0** |
| No ABI handling for better-sqlite3 | Main-process DB tests will crash on CI | **P0** |
| Coverage thresholds are global 70%, not per-layer | IPC handlers and provider adapters could be at 30% and CI passes | **P0** |
| `quality-gate` job is a no-op echo | No enforcement of any quality criteria | **P0** |
| `electron-builder --dir` doesn't produce a runnable app for Playwright | E2E tests will fail to launch | **P0** |
| Three conflicting CI specs (`ci.yml` vs `quality.yml` vs release pipeline) | Unclear which actually runs | **P1** |
| No Vitest multi-project config | Main and renderer tests can't have different environments in one config | **P1** |

### 6.2 Test Design Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No tests for IPC sender/frame validation (security boundary) | Renderer could spoof IPC messages; preload `fs` bridge is unprotected | **P0** |
| No state-machine transition tests for agents | Agent lifecycle bugs (stuck in WORKING, dead transitions) undetected | **P1** |
| No tests for `WorkflowExecutor` step chaining | Orchestrator workflow indexing bug (line 556) untested | **P1** |
| No provider failover unit tests | Failover logic untested at unit level — only E2E | **P1** |
| No IPC schema enforcement runtime tests (malformed message rejection) | Zod validation is specified but not tested | **P1** |
| No migration validation in CI | Schema drift between migrations and schema source goes undetected | **P1** |
| No performance regression tests | Cold start, IPC latency, tool call latency drift over time | **P1** |
| No security tests for API key handling | `apiKeyRef` from secure storage; no test that keys never reach renderer | **P1** |
| No fuzzing tests for data transformers | Provider adapter normalization edge cases untested | **P2** |
| No benchmark tests | Memory usage (≤200MB idle, ≤1GB during task) has no test automation | **P2** |

### 6.3 Process Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| "Manual smoke test on macOS/Windows/Linux" as release gate | Will be skipped consistently; blocks releases | **P1** |
| "Lint passes with zero warnings" | Unrealistic; will cause developer friction | **P1** |
| No test data factory patterns for Dusk types | Fixtures section uses `faker` but Dusk uses deterministic data principle | **P2** |
| No flaky-test quarantine mechanism | 54-test E2E suite will be flaky; no way to isolate | **P2** |
| No coverage reporting in PR comments | Developers can't see coverage impact per-PR | **P2** |

---

## 7. Priority Fixes — Testing Issues That Must Be Resolved First

### P0 Fixes (Blockers — CI will not work without these)

1. **Define or remove `vitest.integration.config.ts`**
   - The `quality.yml` CI job `integration` runs `pnpm vitest run --config vitest.integration.config.ts`. This file is never created in any doc.
   - **Fix:** Either create the config (as a Vitest project in the main config) or merge integration tests into the main Vitest project with appropriate test inclusion patterns.

2. **Add better-sqlite3 ABI handling to CI**
   - better-sqlite3 is ABI-specific. Vitest runs under system Node; the app runs under Electron. Without `pnpm rebuild:node` before tests, main-process DB tests will crash with `MODULE_ABI_VERSION mismatch`.
   - **Fix:** Add `pretest` hook: `pnpm rebuild:node`. Configure `pool: 'forks'` for the main test project in Vitest config.

3. **Add per-file/per-directory coverage thresholds**
   - The global 70% threshold does not protect P0 code (IPC handlers, provider adapters). Vitest supports `thresholds.perFile` and `thresholds.perGroup`.
   - **Fix:** Configure per-directory thresholds:
     ```ts
     thresholds: {
       lines: 70,
       functions: 70,
       branches: 70,
       statements: 70,
       perFile: true,
       perGroup: [
         {
           includes: ['src/main/ipc/**'],
           threshold: { lines: 95, functions: 95, branches: 90, statements: 95 }
         },
         {
           includes: ['src/main/services/provider/**'],
           threshold: { lines: 90, functions: 90, branches: 80, statements: 90 }
         }
       ]
     }
     ```

4. **Fix E2E launch mechanism**
   - `electron-builder --dir` produces an unpacked directory, not a launchable app. Playwright's `electron.launch({ args: ['.'] })` needs a built app or a `--main` flag pointing to `out/main/index.js`.
   - **Fix:** Build the app properly in CI before E2E: `pnpm build` (which runs `electron-vite build`), then launch with `electron.launch({ args: [Path.join(import.meta.dirname, 'out/main/index.js')] })`.

5. **Make quality-gate enforce coverage**
   - The current `quality-gate` job is `echo "All quality checks passed"` — it passes regardless.
   - **Fix:** Add a coverage enforcement step using `c8` or Vitest's `--coverage` output, with a script that reads `coverage/coverage-summary.json` and fails if any per-group threshold is missed. Add a `codecov.yml` with per-directory thresholds.

### P1 Fixes (High — needed for a credible testing foundation)

6. **Consolidate CI into a single, coherent workflow**
   - Three documents describe three different CI pipelines. Unify into one `.github/workflows/ci.yml` with these jobs: lint-typecheck → unit-and-component (sharded) → integration → e2e (matrix) → quality-gate (coverage + metrics enforcement).

7. **Add IPC security tests**
   - Following Cherry's `validateSender.test.ts` pattern, add tests for:
     - Sender frame validation (reject non-app URLs, webview guests, iframe sub-frames)
     - Path traversal in `file:read` / `file:write` IPC handlers
     - Ensure `apiKeyRef` is never returned to the renderer in any IPC response

8. **Adopt Cherry's unified Vitest multi-project config**
   - Single `vitest.config.ts` with projects for `main` (node env, forks pool), `renderer` (jsdom), `integration` (node). Eliminates the nonexistent `vitest.integration.config.ts`.

9. **Replace `:memory:` SQLite tests with real-migration harness**
   - Cherry's `setupTestDatabase()` runs production migrations and truncates tables between tests. Dusk's `:memory:` + hand-written SQL pattern drifts from production schema.

10. **Remove manual smoke tests and "zero warnings" from release gates**
    - Replace with automated checks. "Zero lint warnings" → require zero lint **errors** (biome `check` without warnings is overly strict). "Manual smoke test on 3 OS" → keep as beta-program checklist, not a merge gate.

---

## 8. Recommended Vitest Configuration (Adopting Cherry's Multi-Project Pattern)

```ts
// vitest.config.ts — single multi-project config
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import electronViteConfig from './electron.vite.config'

process.env.TZ = 'UTC'

const mainConfig = (electronViteConfig as any).main
const rendererConfig = (electronViteConfig as any).renderer

export default defineConfig({
  test: {
    projects: [
      {
        name: 'main',
        environment: 'node',
        // better-sqlite3 is a NAN/V8 native addon — NOT safe under worker_threads
        pool: 'forks',
        setupFiles: ['tests/main.setup.ts'],
        include: ['packages/desktop/src/main/**/*.{test,spec}.{ts,tsx}'],
        test: {
          coverage: {
            enabled: true,
            thresholds: {
              perFile: true,
              perGroup: [
                {
                  includes: ['packages/desktop/src/main/ipc/**'],
                  threshold: { lines: 95, functions: 95, branches: 90, statements: 95 }
                },
                {
                  includes: ['packages/desktop/src/main/services/agent-runtime.ts'],
                  threshold: { lines: 90, functions: 90, branches: 85, statements: 90 }
                },
              ]
            }
          }
        }
      },
      {
        name: 'renderer',
        environment: 'jsdom',
        setupFiles: ['tests/renderer.setup.ts'],
        include: ['packages/renderer/src/**/*.{test,spec}.{ts,tsx}'],
      },
      {
        name: 'integration',
        environment: 'node',
        pool: 'forks', // DB + native module access
        setupFiles: ['tests/main.setup.ts'],
        include: ['packages/desktop/src/main/**/__integration__/**/*.{ts,tsx}'],
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        'tests/**',
        '**/*.{test,spec}.{ts,tsx}',
        '**/*.config.{js,ts}',
        // NOTE: main.ts and preload are NOT excluded — they contain critical IPC/security logic
      ],
    },
    globals: true,
    pool: 'threads',
  }
})
```

---

## 9. Summary Table — Dusk vs Cherry Testing Patterns

| Aspect | Dusk (Current Spec) | Cherry (Reference) | Recommendation |
|--------|--------------------|-------------------|----------------|
| Vitest config | Single config + nonexistent `vitest.integration.config.ts` | Multi-project (7 projects), single config | Adopt multi-project; drop separate integration config |
| Native module (better-sqlite3) ABI | Not addressed | Explicit `rebuild:node` / `rebuild:electron`; `pool: 'forks'` for main | Add ABI handling + forks pool |
| Test DB setup | `:memory:` + hand-written `CREATE TABLE` | Real file-backed DB + production migrations + `foreign_keys` assertion | Adopt `setupTestDatabase()` harness |
| Main-process test environment | Not specified (`jsdom` in global config) | `environment: 'node'` for main, `'jsdom'` for renderer | Separate by project |
| E2E coverage | 5 critical flow groups, 3-OS matrix, 20 min | 1 spec (18 lines), window size check only | Keep E2E minimal — trust unit/integration |
| CI test selection | All tests on every PR | Path-filtered (`dorny/paths-filter`), conditionally run | Add path filtering + sharding |
| Coverage thresholds | Global 70% flat | None (CI fails on `--deny-warnings` lint, not coverage) | Add per-layer/per-file thresholds |
| IPC security tests | Only schema loading tests | `validateSender.test.ts` (118 lines, security boundary) | Add IPC sender/path-traversal tests |
| Mock system | Ad-hoc per test file | Unified global mocks (`main.setup.ts`, `renderer.setup.ts`) | Create unified setup files |
| Test value principle | None | "Value Gate" — test must catch realistic regressions | Adopt Value Gate for review |
| ABI note | None | Documented at `database-testing.md` §"Gotchas" | Document in Dusk testing docs |
| Timezone | Not addressed | `process.env.TZ = 'UTC'` | Add TZ fix to test setup |
| Flaky test handling | Retries: CI → 2, local → 0 | Same | Acceptable; Cherry's minimal E2E reduces flakiness surface |
