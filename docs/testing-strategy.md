# Dusk — Testing Strategy & QA Framework

## 1. Quality Gates

### 1.1 Definition of Ready for Release

A build is considered **release-ready** when all of the following are true:

- All automated tests pass (unit, component, integration, E2E)
- No `P0` or `P1` bugs open
- No `P2` bugs older than 7 days without an assigned owner and fix target
- TypeScript strict mode compiles with zero errors
- Lint passes with zero warnings
- Bundle size within performance budget (see §1.4)
- Test coverage meets minimum thresholds (see §1.3)
- Accessibility audit score ≥ 90% on all critical flows
- Manual smoke test passes on macOS, Windows, and Linux
- Release notes drafted and reviewed

### 1.2 Bug Severity Levels

| Level | Label | Definition | Response SLA | Examples |
|-------|-------|------------|--------------|----------|
| P0 | Blocker | App crash, data loss, security vulnerability, complete feature failure | Fix within 24h; blocks release | App won't start, provider key leak, workspace DB corruption |
| P1 | Critical | Major feature broken, no workaround available | Fix within 3 days; blocks release | Chat doesn't stream, IPC deadlock, file save fails silently |
| P2 | Major | Feature degraded, workaround exists but non-obvious | Fix within 2 weeks | Agent tool call fails for one provider, UI lag on large workspaces |
| P3 | Minor | Cosmetic, edge case, or inconvenience with clear workaround | Fix within next sprint | Tooltip typo, scroll jitter, theme mismatch on one screen |
| P4 | Trivial | Nitpick, polish item | Backlog | Icon alignment off by 2px, animation easing preference |

### 1.3 Test Coverage Requirements

| Layer | Minimum Coverage | Target Coverage |
|-------|-----------------|-----------------|
| Core services (main process) | 80% | 90% |
| IPC handlers & contracts | 90% | 95% |
| Agent runtime (lifecycle, tools, orchestration) | 80% | 90% |
| React components (UI layer) | 70% | 85% |
| Utilities & pure functions | 90% | 95% |
| Provider adapters | 85% | 90% |
| Database layer (queries, migrations) | 85% | 90% |
| E2E critical paths | 100% of critical flows | — |

**Critical flows** (must have E2E coverage):
- Install → first launch → workspace creation → first chat → first agent task → artifact save
- Provider config → chat with model → stream response → stop generation
- File import → workspace storage → file read by agent → artifact output
- Multi-agent: orchestrator → specialist → artifact chain
- Offline/online provider failover

### 1.4 Performance Budgets

| Metric | Budget | Measurement |
|--------|--------|-------------|
| App cold start (main window visible) | ≤ 3s | Playwright E2E on CI |
| IPC round-trip (renderer → main → renderer) | ≤ 50ms | Integration test |
| Chat message render (first paint) | ≤ 100ms | Component perf test |
| Agent tool call (start → first stream chunk) | ≤ 500ms | Integration test |
| Bundle size (main process) | ≤ 50MB | electron-builder output |
| Bundle size (renderer) | ≤ 5MB gzipped | Vite build + rollup-plugin-visualizer |
| Memory at idle | ≤ 200MB | Playwright memory snapshot |
| Memory during agent task | ≤ 1GB | Playwright memory snapshot |
| DB query (single workspace fetch) | ≤ 10ms | Integration test with realistic data |

## 2. Test Strategy

### 2.1 Test Pyramid

```
        /\
       /E2E\          ← Few, expensive, high-confidence
      /------\
     /Integr.\        ← Moderate, targeted service/IPC tests
    /----------\
   /  Component \     ← Moderate, UI behavior isolation
  /--------------\
 /     Unit       \   ← Many, fast, cheap, logic coverage
/------------------\
```

### 2.2 Unit Tests (Vitest)

**Scope:** Pure functions, utilities, data transformers, validation schemas, provider adapters, database query builders, agent runtime logic.

**Tools:**
- Vitest as test runner
- `vitest-mock-extended` for typed mocks
- `tinyspy` for spy/timing assertions

**Pattern:**
```ts
describe('ProviderAdapter.openai', () => {
  it('normalizes OpenAI chat completions to Dusk message format', () => {
    const input = { choices: [{ message: { role: 'user', content: 'hi' } }] };
    expect(openAIAdapter.normalizeChatResponse(input)).toEqual({
      role: 'user',
      content: 'hi',
      usage: expect.any(Object),
    });
  });

  it('throws on 401 with provider error detail', () => {
    mockFetch.mockRejectOnce(new ProviderAuthError('Invalid API key'));
    expect(() => openAIAdapter.chat(request)).rejects.toThrow(ProviderAuthError);
  });
});
```

### 2.3 Component Tests (Testing Library)

**Scope:** React components in the renderer process — chat message list, workspace sidebar, agent card, settings panels, file tree, artifact viewer.

**Tools:**
- Vitest + `@testing-library/react`
- `@testing-library/jest-dom` for assertions
- `@testing-library/user-event` for interaction
- `@testing-library/async` for async UI states

**Pattern:**
```tsx
describe('ChatMessageList', () => {
  it('renders messages and auto-scrolls on new message', async () => {
    const { container, getByText } = render(
      <ChatMessageList messages={initialMessages} />
    );
    expect(getByText('Hello')).toBeInTheDocument();

    act(() => {
      addMessage({ role: 'assistant', content: 'World' });
    });

    const list = container.querySelector('[data-testid="chat-scroll"]');
    expect(list.scrollTop).toBeGreaterThan(0);
  });

  it('renders artifact attachment when message has artifact', () => {
    render(<ChatMessageList messages={[msgWithArtifact]} />);
    expect(getByText('report.md')).toBeInTheDocument();
  });
});
```

**Test IDs:** Use `data-testid` sparingly — prefer `getByRole`, `getByLabelText`, `getByText`. Use `data-testid` only when the element has no accessible name.

### 2.4 Integration Tests

**Scope:** IPC channel contracts, service container wiring, database operations, provider round-trips (mocked), agent runtime with tool execution, file system operations.

**Tools:**
- Vitest with `electron-mocha`-style harness or custom test double
- `better-sqlite3` with in-memory database for DB tests
- `msw` (Mock Service Worker) for intercepting network calls in integration tests

**Pattern — IPC:**
```ts
describe('IPC: chat.sendMessage', () => {
  let ipcMain: IpcMain;
  let ipcRenderer: IpcRenderer;

  beforeEach(() => {
    ipcMain = createIpcMain();
    ipcRenderer = createIpcRenderer(ipcMain);
    registerChatHandlers(ipcMain, chatService);
  });

  it('returns streamed chunks via onMessage callback', async () => {
    const chunks: string[] = [];
    ipcRenderer.on('chat.chunk', (_event, chunk) => chunks.push(chunk));

    const promise = ipcRenderer.invoke('chat.sendMessage', {
      workspaceId: 'ws-1',
      message: 'Hello',
    });

    await promise;
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('Hello');
  });
});
```

**Pattern — Database:**
```ts
describe('WorkspaceRepository', () => {
  let db: Database;
  let repo: WorkspaceRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    migrate(db);
    repo = new WorkspaceRepository(db);
  });

  it('creates workspace with default agent config', () => {
    const ws = repo.create({ name: 'Test', providerId: 'openai' });
    expect(ws.id).toBeDefined();
    expect(ws.defaultAgentId).toBeDefined();
  });
});
```

**Pattern — Agent Runtime:**
```ts
describe('AgentRuntime', () => {
  it('executes tool call and returns artifact', async () => {
    const runtime = new AgentRuntime({
      tools: [mockFileReadTool],
      workspace: mockWorkspace,
    });

    const result = await runtime.executeStep({
      type: 'tool_call',
      name: 'file_read',
      args: { path: 'spec.md' },
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].name).toBe('spec.md');
  });
});
```

### 2.5 E2E Tests (Playwright)

**Scope:** End-to-end user journeys that span main process, renderer, IPC, and provider APIs.

**Tools:**
- Playwright with Electron project (`@playwright/test`)
- `playwright-electron` for Electron app lifecycle management
- Page Object Model for test maintainability

**Directory structure:**
```
tests/
  e2e/
    pages/
      ChatPage.ts
      WorkspacePage.ts
      SettingsPage.ts
      OnboardingPage.ts
    specs/
      onboarding.spec.ts
      chat-flow.spec.ts
      agent-task.spec.ts
      provider-config.spec.ts
      file-manager.spec.ts
    fixtures/
      workspaces.ts
      providers.ts
```

**Pattern:**
```ts
// tests/e2e/pages/ChatPage.ts
export class ChatPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('app://dusk/workspace/1/chat');
  }

  async sendMessage(text: string) {
    await this.page.getByPlaceholder('Type a message...').fill(text);
    await this.page.keyboard.press('Enter');
  }

  async waitForStreamComplete() {
    await this.page.waitForSelector('[data-testid="stream-complete"]', {
      timeout: 30000,
    });
  }
}

// tests/e2e/specs/chat-flow.spec.ts
test('full chat with streaming', async ({ electronApp }) => {
  const app = new DuskApp(electronApp);
  await app.launch();

  const chat = new ChatPage(app.mainWindow);
  await chat.goto();
  await chat.sendMessage('What is 2+2?');
  await chat.waitForStreamComplete();

  await expect(chat.getLastMessage()).toContain('4');
});
```

### 2.6 Visual Regression Tests

**Scope:** Critical UI surfaces where layout drift causes user confusion — chat layout, workspace sidebar, settings panels, artifact viewer.

**Tools:**
- Playwright screenshots with `expect(page).toHaveScreenshot()`
- Baselines stored in version control
- Approval workflow for baseline updates

**Config:**
```ts
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
  projects: [
    {
      name: 'visual-tests',
      testMatch: /visual\.spec\.ts$/,
      snapshotDir: 'tests/e2e/__snapshots__',
    },
  ],
});
```

### 2.7 Accessibility Tests

**Scope:** All interactive components and critical user flows.

**Tools:**
- `@axe-core/playwright` for E2E a11y scanning
- `jest-axe` for component-level a11y tests
- Manual keyboard navigation testing for complex widgets

**Pattern — Component:**
```ts
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<ChatInput onSubmit={jest.fn()} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Pattern — E2E:**
```ts
test('chat interface is keyboard navigable', async ({ page }) => {
  await page.goto('app://dusk/workspace/1/chat');
  await page.keyboard.press('Tab');
  await expect(page.getByPlaceholder('Type a message...')).toBeFocused();

  await page.keyboard.type('Hello{Enter}');
  await expect(page.getByText('Hello')).toBeInTheDocument();
});
```

**Critical a11y requirements:**
- All interactive elements keyboard accessible
- Focus management in chat, modals, and agent task panels
- Screen reader announcements for streaming responses
- Color contrast ≥ 4.5:1 for all text
- No information conveyed by color alone

## 3. Test Infrastructure

### 3.1 Vitest Configuration

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        'tests/**',
        'src/main/main.ts',
        'src/preload/**',
      ],
    },
  },
});
```

### 3.2 Playwright / E2E Configuration

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-junit.xml' }],
  ],
  use: {
    baseURL: 'app://dusk',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Electron will be launched separately via electronApp fixture
  ],
  // Electron-specific setup in global-setup.ts
});
```

### 3.3 CI Test Pipeline

```yaml
# .github/workflows/quality.yml
name: Quality Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  release:
    types: [created]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm biome check .
      - run: pnpm tsc --noEmit

  unit-and-component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unit-component

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run --config vitest.integration.config.ts

  e2e:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm electron-builder --dir  # Build but don't package
      - run: pnpm playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.os }}
          path: playwright-report/
          retention-days: 14

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=moderate

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm analyze-bundle  # Custom script using rollup-plugin-visualizer

  quality-gate:
    needs: [lint-and-typecheck, unit-and-component, integration, e2e, dependency-audit, bundle-size]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All quality checks passed"
```

### 3.4 Test Data and Fixtures

**Principles:**
- Deterministic: no flaky random data
- Isolated: each test gets fresh state
- Realistic: data shapes match production

**Directory structure:**
```
tests/
  fixtures/
    providers/
      openai.json
      anthropic.json
      fugoku-gateway.json
    workspaces/
      empty-workspace.json
      populated-workspace.json
      large-workspace.json
    conversations/
      short-conversation.json
      long-conversation.json
      with-artifacts.json
    agents/
      workspace-agent.json
      task-agent-running.json
      specialist-coder.json
  factories/
    workspace.factory.ts
    conversation.factory.ts
    message.factory.ts
    agent.factory.ts
    artifact.factory.ts
```

**Factory pattern:**
```ts
// tests/factories/workspace.factory.ts
export const createWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  providerId: 'openai',
  defaultAgentId: faker.string.uuid(),
  theme: 'dusk',
  ...overrides,
});
```

### 3.5 Mocking Strategy

**Providers:**
- Mock at the adapter boundary
- Use `msw` for network-level interception in integration tests
- Use `vitest-mock-extended` for unit tests
- Pre-built mock providers in `tests/fixtures/providers/`

```ts
// tests/mocks/providers.ts
export const mockOpenAIProvider = {
  chat: vi.fn().mockResolvedValue({
    id: 'mock-response',
    choices: [{ message: { role: 'assistant', content: 'Mocked response' } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  }),
  stream: vi.fn().mockReturnValue(mockStream('Mocked stream')),
};
```

**Filesystem:**
- Use `memfs` for renderer-process filesystem tests
- Use `mock-fs` or temp directories for main-process tests
- Never write to actual user disk during tests

```ts
// tests/mocks/fs.ts
import { Volume } from 'memfs';

export const createMockFs = (files: Record<string, string>) => {
  const vol = Volume.fromJSON(files);
  vi.mock('fs/promises', () => ({
    ...fsPromises,
    readFile: (path: string) => vol.promises.readFile(path, 'utf-8'),
    writeFile: (path: string, data: string) => vol.promises.writeFile(path, data),
  }));
};
```

**IPC:**
- Create test doubles that mirror real IPC channels
- Validate message schemas with Zod in both test doubles and production

```ts
// tests/mocks/ipc.ts
export const createMockIpc = () => ({
  invoke: vi.fn(),
  on: vi.fn(),
  send: vi.fn(),
  removeListener: vi.fn(),
});
```

**Database:**
- Use `better-sqlite3` with `:memory:` for integration tests
- Run migrations before each test suite
- Seed with factory-generated data

```ts
// tests/setup/db.ts
export const setupTestDb = () => {
  const db = new Database(':memory:');
  migrate(db);
  seedInitialData(db);
  return db;
};
```

## 4. Test Coverage Plan

### 4.1 Critical Paths

| # | Path | Priority | Why |
|---|------|----------|-----|
| 1 | Provider registration + key validation | P0 | Prevents broken app on launch |
| 2 | Chat message flow (send → stream → display) | P0 | Core user experience |
| 3 | IPC channel schema enforcement | P0 | Main/renderer contract stability |
| 4 | Workspace creation + persistence | P0 | Data integrity |
| 5 | Agent task lifecycle (spawn → execute → artifact) | P0 | Differentiator vs competitors |
| 6 | File read/write within workspace | P0 | Artifact production |
| 7 | Provider failover | P1 | Reliability |
| 8 | MCP tool execution | P1 | Extensibility |
| 9 | Theme switching | P1 | Brand experience |
| 10 | Settings persistence | P1 | User trust |

### 4.2 Coverage Targets by Layer

| Layer | Target | Priority |
|-------|--------|----------|
| Provider adapters | 90% | P0 |
| IPC handlers | 95% | P0 |
| Agent runtime | 90% | P0 |
| Database queries | 90% | P0 |
| React components (core UI) | 80% | P1 |
| Utilities | 90% | P1 |
| Theme system | 85% | P2 |
| Settings panels | 80% | P2 |

### 4.3 Prioritization Order

1. **Week 1 (Foundation):** Set up test infrastructure, write IPC contract tests, provider adapter tests
2. **Week 2 (Core services):** Database tests, agent runtime unit tests, workspace creation flow
3. **Week 3 (UI layer):** Chat component tests, workspace sidebar, settings
4. **Week 4 (Integration):** Agent task E2E, provider round-trip, failover
5. **Ongoing:** E2E visual regression, accessibility audit, performance monitoring

## 5. Testing Patterns

### 5.1 Component Testing Patterns

**Pattern — Async data loading:**
```tsx
it('shows loading state then renders messages', async () => {
  render(<ConversationView conversationId="conv-1" />);
  expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument());
});
```

**Pattern — IPC-dependent component:**
```tsx
// Use the real IPC context with a test double
import { IpcProvider } from '@/contexts/IpcContext';

it('renders provider status', () => {
  render(
    <IpcProvider value={mockIpc}>
      <ProviderStatus providerId="openai" />
    </IpcProvider>
  );
  expect(screen.getByText('Connected')).toBeInTheDocument();
});
```

**Pattern — Error boundary:**
```tsx
it('renders error state on provider failure', async () => {
  mockIpc.invoke.mockRejectedValueOnce(new Error('Provider down'));
  render(<ChatInterface workspaceId="ws-1" />);
  await userEvent.type(screen.getByPlaceholder('...'), 'Hello');
  await userEvent.keyboard.press('Enter');
  await expect(screen.getByText(/provider unavailable/i)).toBeInTheDocument();
});
```

### 5.2 Service Testing Patterns

**Pattern — Service with dependencies:**
```ts
describe('ChatService', () => {
  let service: ChatService;
  let mockProvider: Mocked<ProviderAdapter>;
  let mockRepo: Mocked<ConversationRepository>;

  beforeEach(() => {
    mockProvider = createMock(ProviderAdapter);
    mockRepo = createMock(ConversationRepository);
    service = new ChatService(mockProvider, mockRepo);
  });

  it('saves user message before calling provider', async () => {
    await service.sendMessage('ws-1', 'Hello');
    expect(mockRepo.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Hello' })
    );
  });
});
```

### 5.3 IPC Testing Patterns

**Pattern — Channel registration validation:**
```ts
describe('IPC contract validation', () => {
  const schemas = loadIpcSchemas();

  it('all channels have input and output schemas', () => {
    for (const [channel, schema] of Object.entries(schemas)) {
      expect(schema.input).toBeDefined();
      expect(schema.output).toBeDefined();
    }
  });

  it('rejects messages that fail schema validation', async () => {
    const invalidMessage = { workspaceId: 123 }; // should be string
    await expect(ipcRenderer.invoke('chat.sendMessage', invalidMessage)).rejects.toThrow(
      ZodError
    );
  });
});
```

### 5.4 Agent Runtime Testing Patterns

**Pattern — Agent lifecycle:**
```ts
describe('TaskAgent lifecycle', () => {
  it('transitions through idle → working → completed', async () => {
    const agent = new TaskAgent({ name: 'test-task', tools: [mockTool] });
    expect(agent.state).toBe('idle');

    const promise = agent.run('Write a spec');
    expect(agent.state).toBe('working');

    await promise;
    expect(agent.state).toBe('completed');
    expect(agent.artifacts).toHaveLength(1);
  });

  it('emits state change events', async () => {
    const agent = new TaskAgent({ name: 'test-task' });
    const states: AgentState[] = [];
    agent.onStateChange((state) => states.push(state));

    await agent.run('Do something');

    expect(states).toContain('working');
    expect(states).toContain('completed');
  });
});
```

**Pattern — Tool permission enforcement:**
```ts
it('blocks tool call outside workspace permissions', async () => {
  const agent = new TaskAgent({
    tools: [fileReadTool, fileWriteTool],
    permissions: { fileWrite: false },
  });

  await expect(agent.executeStep({
    type: 'tool_call',
    name: 'file_write',
    args: { path: 'secret.txt', content: 'leak' },
  })).rejects.toThrow(PermissionDeniedError);
});
```

## 6. Automated Quality Checks

### 6.1 Linting

**Tool:** Biome (replaces ESLint + Prettier in this project)

```json
// biome.json
{
  "vite": true,
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "a11y": {
        "useKeyWithClickEvents": "error",
        "useButtonType": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

**Commands:**
```bash
pnpm biome check .          # Check all files
pnpm biome check --write .  # Auto-fix
```

**Pre-commit hook (lint-staged + husky):**
```json
// package.json scripts
"prepare": "husky install"
```

```bash
# .husky/pre-commit
pnpm biome check --write --staged
pnpm vitest related --run
```

### 6.2 Type Checking

**Config:** `tsconfig.json` with strict mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Command:**
```bash
pnpm tsc --noEmit
```

### 6.3 Formatting

Handled by Biome (see §6.1). No separate Prettier config needed.

### 6.4 Dependency Auditing

```bash
pnpm audit --audit-level=moderate  # Check for vulnerabilities
pnpm outdated                      # Check for outdated packages
```

**Automated:** Dependabot for security patches, Renovate for version updates.

### 6.5 Bundle Size Monitoring

```ts
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**CI enforcement:**
```bash
# Compare bundle size against baseline
pnpm build
SIZE=$(gzip -c dist/renderer/*.js | wc -c)
if [ "$SIZE" -gt 5242880 ]; then
  echo "Bundle size exceeds 5MB: ${SIZE}"
  exit 1
fi
```

## 7. Manual Testing

### 7.1 Exploratory Testing Areas

Each phase or major feature ships with an exploratory test charter:

| Charter | Area | Focus |
|---------|------|-------|
| ET-01 | Onboarding flow | First-launch experience, provider setup, workspace creation |
| ET-02 | Chat interface | Streaming, error states, long conversations, copy/paste |
| ET-03 | Agent tasks | Tool use, artifact production, lifecycle visibility |
| ET-04 | File management | Import, organize, read by agents, artifact export |
| ET-05 | Settings & providers | Config changes, key rotation, provider switching |
| ET-06 | Performance | Cold start, large workspaces, memory usage, multi-tab |
| ET-07 | Accessibility | Keyboard navigation, screen reader, contrast |
| ET-08 | Cross-platform | macOS, Windows, Linux feature parity |

**Exploratory test notes:** Use a shared Notion or Obsidian doc per charter. Capture screenshots and reproduction steps for any finding. Link findings to GitHub issues with `P{severity}` labels.

### 7.2 Beta Testing Program

**Phased rollout:**
1. **Internal (Week 1-2):** Core team + 5 trusted users. Daily feedback loop.
2. **Alpha (Week 3-4):** 50 users from waitlist. Weekly surveys, structured bug reports.
3. **Beta (Week 5-8):** 200-500 users. Public Discord, automated crash reporting.
4. **RC (Release Candidate):** Stable build, last critical bug fixes, final accessibility pass.

**Feedback channels:**
- In-app: "Report Issue" button that opens GitHub issue with auto-collected diagnostics (OS, Electron version, app version, logs)
- Discord: #beta-feedback channel
- Email: beta@dusk.work

**Crash reporting:**
- Sentry for error tracking (with user consent)
- Structured logs with PII scrubbing
- Opt-in telemetry toggle in settings

### 7.3 Bug Reporting Workflow

```
User reports bug
    │
    ▼
Triage (within 24h)
    │
    ├── P0/P1 → Assigned to dev immediately, Slack alert
    │
    ├── P2 → Ticket created, assigned within 3 days
    │
    ├── P3 → Backlog, triaged weekly
    │
    └── Duplicate → Linked, original ticket updated
         │
         ▼
Reproduction
    │
    ├── Can reproduce → Fix scheduled, bug linked to PR
    │
    └── Cannot reproduce → Request more info, close after 7 days if no response
         │
         ▼
Fix + Verification
    │
    ├── Regression test added
    │
    └── QA verification (manual or automated)
         │
         ▼
Close + Release notes
```

## 8. CI/CD Integration

### 8.1 Test Stages in GitHub Actions

```
PR Opened
  │
  ├─► lint-and-typecheck    (required, ~30s)
  │
  ├─► unit-and-component    (required, ~2min)
  │
  ├─► integration           (required, ~3min)
  │
  ├─► dependency-audit      (required, ~1min)
  │
  └─► quality-gate          (gates merge to main)
       │
       ▼
  Merged to main
       │
       ├─► e2e (all 3 OS)   (required, ~20min)
       │
       ├─► bundle-size      (required, ~2min)
       │
       └─► preview-build    (optional, for QA)
            │
            ▼
  Release tagged
       │
       ├─► e2e (all 3 OS)   (required, full suite)
       │
       ├─► accessibility-audit (required)
       │
       ├─► performance-benchmark (required)
       │
       ├─► build (all platforms) (required)
       │
       └─► signed-artifacts + GitHub Release
```

### 8.2 Quality Gates Before Merge

A PR **cannot** be merged to `main` unless:

- ✅ `lint-and-typecheck` passes (no errors, no warnings)
- ✅ `unit-and-component` passes with ≥70% coverage
- ✅ `integration` passes
- ✅ `dependency-audit` passes (no moderate+ vulnerabilities)
- ✅ Code review approved by at least one team member
- ✅ No conflicts with `main`
- ✅ Conventional commit message (or linked issue number)

**Branch protection rules:**
```yaml
# .github/branch-protection.yml (configured in repo settings)
required_status_checks:
  strict: true
  contexts:
    - lint-and-typecheck
    - unit-and-component
    - integration
    - dependency-audit
required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_code_owner_reviews: false
enforce_admins: false
```

### 8.3 Release Testing Checklist

**Pre-release (RC build):**
- [ ] All quality gates pass on `main`
- [ ] E2E suite passes on all 3 OS targets
- [ ] Accessibility audit score ≥ 90%
- [ ] Performance benchmarks within budget
- [ ] Bundle size within budget
- [ ] Dependency audit: no high/critical vulnerabilities
- [ ] Changelog drafted from conventional commits
- [ ] Release notes reviewed by 2 team members
- [ ] Manual smoke test on macOS (primary dev platform)
- [ ] Manual smoke test on Windows (VM or physical)
- [ ] Manual smoke test on Linux (VM)

**Release day:**
- [ ] Tag created: `v1.0.0`
- [ ] CI builds signed packages (mac notarized, Windows signed, Linux AppImage)
- [ ] GitHub Release published with changelog
- [ ] Homebrew tap updated (if applicable)
- [ ] Website download links updated
- [ ] Discord announcement posted
- [ ] Beta users notified

**Post-release:**
- [ ] Sentry dashboard checked for new errors (24h, 7d)
- [ ] Crash-free rate ≥ 99%
- [ ] Support channels monitored for issues
- [ ] Hotfix plan ready if P0/P1 emerges

---

*This document is the authoritative testing standard for Dusk. All contributors are expected to follow these patterns. The QA Engineering agent is responsible for maintaining and updating this document as the product evolves.*
