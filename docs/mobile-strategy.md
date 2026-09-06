# Dusk — Mobile Strategy

> **Status:** Phase 2+ plan. Desktop-first (Phase 1). Ready to execute when Phase 1 ships.

---

## 1. Mobile Strategy

### 1.1 Why Mobile for Dusk

Dusk is a **Work OS** — professionals use it to do AI-assisted work. Mobile extends that work to contexts where desktop isn't available:

- **On-the-go review** — read agent outputs, review artifacts, continue conversations while traveling
- **Quick catch-up** — check workspace activity, agent status, pending tasks
- **Mobile capture** — snap photos, record voice notes, draft thoughts that sync into workspaces
- **Always-on notifications** — know when a Task Agent completes or an Orchestrator needs input
- **Professional credibility** — serious tools have mobile apps; absence signals immaturity

The mobile app is **not** the primary work surface. Desktop remains where deep work happens. Mobile is the lightweight companion that keeps you connected.

### 1.2 Phase 2 vs Phase 3 Scope

**Phase 2 (Mobile MVP)**
- Read-only workspace browsing (workspaces, chats, files, artifacts)
- Chat viewing + simple message input (text, voice transcription)
- Agent status monitoring (active/running/completed/failed)
- Provider config (basic — enough to send messages)
- Settings (theme, notifications, provider keys)
- Local-first with SQLite; no cloud sync yet

**Phase 3 (Mobile + Fugoku Cloud)**
- Real-time sync with Fugoku Cloud (cross-device workspace continuity)
- Push notifications for agent completions, task updates
- File upload from mobile (camera, gallery, files)
- Team/shared workspace support (Fugoku IAM)
- Background sync agents
- Mobile-specific agent interactions (voice, camera, location context)

### 1.3 What's NOT in Scope (Keep It Lean)

- **No mobile model training** — that's Fugoku Cloud
- **No full workspace management** — create/edit workspaces stays on desktop
- **No complex multi-agent orchestration UI** — monitor only, configure on desktop
- **No code execution sandbox** — mobile screens are too small for meaningful coding
- **No MCP server management** — configure on desktop, consume on mobile
- **No web version** — desktop + mobile only, consistent with standalone positioning

### 1.4 Desktop-to-Mobile Parity Roadmap

| Capability | Desktop | Mobile Phase 2 | Mobile Phase 3 |
|---|---|---|---|
| Browse workspaces | ✅ | ✅ | ✅ |
| View chat history | ✅ | ✅ | ✅ |
| Send/receive messages | ✅ | ✅ | ✅ |
| View artifacts/files | ✅ | ✅ | ✅ |
| Create/delete workspaces | ✅ | ❌ | ❌ |
| Configure agents/specialists | ✅ | ❌ | ❌ |
| Run task agents | ✅ | View only | ✅ |
| Multi-agent orchestrator | ✅ | View only | ✅ |
| MCP tool management | ✅ | ❌ | ❌ |
| Cloud sync | ✅ | ❌ | ✅ |
| Push notifications | ✅ | ❌ | ✅ |
| File upload from mobile | ❌ | ❌ | ✅ |
| Voice input | ❌ | ✅ | ✅ |
| Team workspaces | ❌ | ❌ | ✅ |

---

## 2. Tech Stack Decisions

### 2.1 React Native + Expo

**Rationale:**
- Dusk Studio's mobile app (dusk-studio-app) uses Expo + React Native 0.81 — validates the choice
- Expo handles native build complexity (EAS), OTA updates, and platform quirks
- React Native's component model maps cleanly to React on desktop — shared patterns
- Strong TypeScript support
- Expo SQLite + Drizzle already proven in dusk-studio-app

**Expo SDK:** ~54 (track desktop Phase 1 timeline; bump if needed)

**Version constraints:**
- React: 19.x (matches desktop React 18+ pattern, dusk-studio-app uses 19.1)
- React Native: 0.81+ (dusk-studio-app baseline)
- TypeScript: ~5.9 (strict mode, matches desktop)

### 2.2 Drizzle ORM for Local DB (SQLite)

**Rationale:**
- Desktop uses better-sqlite3; mobile uses `expo-sqlite` — both are SQLite, same data model possible
- Drizzle provides type-safe queries, schema migrations, and Drizzle Studio for inspection
- Schema can be shared (with platform adapters) — same tables, different driver
- dusk-studio-app already uses drizzle-orm + expo-sqlite successfully

**Mobile DB stack:**
- `expo-sqlite` (native SQLite on device)
- `drizzle-orm` + `drizzle-kit` (schema + migrations)
- Local-first: all data on device by default
- Sync layer writes to Fugoku Cloud when available

### 2.3 Navigation Strategy

**Framework:** React Navigation v7 (matches dusk-studio-app)

**Structure:**
- Root: `Stack.Navigator` (auth → main app)
- Main: `BottomTabNavigator` (Workspaces, Chats, Agents, Files)
- Modals: `Stack.Navigator` inside tabs for detail screens (chat, file viewer, settings)
- Deep linking: Universal links for workspace/chat/message deep access

**Mobile navigation principles:**
- Maximum 3 levels deep (tab → list → detail)
- Bottom tabs for primary contexts (matches mobile conventions)
- Swipe gestures where natural (chat thread swipe back, file gallery swipe)
- Native-feeling transitions, not desktop port

### 2.4 State Management

**Framework:** Zustand (lighter than Redux Toolkit for mobile)

**Rationale:**
- Dusk-studio-app uses Redux Toolkit — proven but heavier
- Dusk desktop may use Zustand or Redux — align with desktop decision
- For mobile MVP, Zustand is simpler, less boilerplate, works with React Native
- Persist to MMKV (not AsyncStorage) for performance

**Key stores:**
- `useWorkspaceStore` — current workspace, active chats, unread counts
- `useChatStore` — active thread, messages, streaming state
- `useAgentStore` — agent statuses, running jobs
- `useProviderStore` — configured providers, API keys (encrypted at rest)
- `useSettingsStore` — theme, notifications, sync preferences

**Sync with desktop:** When Fugoku Cloud sync activates, stores derive from server state with local optimistic updates.

### 2.5 UI Component Strategy

**Decision: Build mobile-native components, extract shared design tokens.**

Dusk Studio's mobile app uses HeroUI Native + UniwindCSS. Dusk should **not** copy this — Dusk has its own design system (dusk/twilight palette, calm aesthetic).

**Approach:**
1. **Shared layer** (monorepo package): design tokens, color system, typography scale, spacing, motion curves
2. **Mobile components**: built in React Native using shared tokens — NOT desktop components
3. **No component reuse** between desktop (HTML/CSS) and mobile (React Native) — different rendering targets

**Mobile UI stack:**
- React Native primitives + `moti` for animations (matches dusk-studio-app)
- `react-native-skia` for charts/visualizations (if needed)
- `expo-blur` + `expo-linear-gradient` for Dusk atmosphere effects
- `react-native-markdown-display` or similar for chat rendering
- `react-native-reanimated` + `react-native-gesture-handler` for interactions
- Lucide icons (`lucide-react-native`) — same icon set as desktop

**Why not share components:** Desktop uses HTML/CSS (shadcn/ui + Tailwind). Mobile uses native views. Even with React Native Web, the interaction patterns differ enough that direct sharing creates more complexity than value.

---

## 3. App Architecture

### 3.1 Project Structure

```
apps/
  mobile/                          # Expo app
    App.tsx                        # Root component, providers
    app.config.ts                  # Expo config
    eas.json                        # EAS build profiles
    metro.config.js
    babel.config.js
    index.js                       # Entry point
    drizzle.config.ts              # DB migration config
    assets/
    src/
      aiCore/                      # Provider abstraction (ported from desktop)
        providers/                 # Provider adapters
        streaming/                 # SSE / streaming handlers
        index.ts
      components/
        ui/                        # Reusable UI primitives
        chat/                      # Chat-specific components
        workspace/                 # Workspace list/cards
        agent/                     # Agent status indicators
        markdown/                  # Message rendering
        shared/                    # Cross-cutting components
      config/
        models.ts                  # Model definitions
        providers.ts               # Provider configs
        constants.ts               # App constants
      database/
        schema/                    # Drizzle schema files
        migrations/                # Generated migrations
        index.ts                   # DB connection
        repositories/              # Data access layer
      hooks/
        useChat.ts
        useWorkspaces.ts
        useAgents.ts
        useSync.ts
        useProviders.ts
      navigators/
        index.tsx                  # Root navigator
        TabNavigator.tsx
        WorkspaceNavigator.tsx
        ChatNavigator.tsx
        AgentNavigator.tsx
      screens/
        WorkspacesScreen.tsx
        ChatScreen.tsx
        AgentMonitorScreen.tsx
        FilesScreen.tsx
        FileViewerScreen.tsx
        SettingsScreen.tsx
        ProviderConfigScreen.tsx
        WelcomeScreen.tsx
      services/
        provider.ts                # Provider API client
        sync.ts                    # Fugoku Cloud sync (Phase 3)
        storage.ts                 # Encrypted key storage
        notifications.ts           # Push notification handler
        logger.ts                  # App logging
      store/                       # Zustand stores
        useWorkspaceStore.ts
        useChatStore.ts
        useAgentStore.ts
        useProviderStore.ts
        useSettingsStore.ts
      types/
        workspace.ts
        chat.ts
        agent.ts
        provider.ts
        sync.ts
      utils/
        formatting.ts
        markdown.ts
        secure.ts                  # Keychain/crypto utilities
        permissions.ts
      i18n/
        locales/                   # Translation files
        index.ts
    __tests__/
    global.css

packages/
  shared/                          # Monorepo shared package
    src/
      tokens/
        colors.ts                 # Dusk color system
        typography.ts             # Font scales
        spacing.ts                # Spacing constants
        motion.ts                 # Animation curves
      types/
        workspace.ts              # Shared TypeScript types
        chat.ts
        agent.ts
        provider.ts
      utils/
        formatters.ts             # Date, number, markdown helpers
        validators.ts
      index.ts
```

### 3.2 Navigation Flow

```
WelcomeScreen (first launch)
  │
  ▼
MainTabs
  ├── WorkspacesTab
  │     └── WorkspaceStack
  │           ├── WorkspaceListScreen
  │           └── WorkspaceDetailScreen (chats + files)
  │
  ├── ChatsTab
  │     └── ChatStack
  │           ├── ChatListScreen
  │           └── ChatScreen (detail)
  │
  ├── AgentsTab
  │     └── AgentStack
  │           ├── AgentListScreen
  │           ├── AgentDetailScreen
  │           └── AgentMonitorScreen
  │
  ├── FilesTab
  │     └── FileStack
  │           ├── FileListScreen
  │           └── FileViewerScreen
  │
  └── SettingsTab
        └── SettingsStack
              ├── SettingsScreen
              ├── ProviderConfigScreen
              └── SyncSettingsScreen (Phase 3)
```

### 3.3 Screen Inventory

| Screen | Phase | Purpose |
|---|---|---|
| WelcomeScreen | 2 | First launch, permissions, provider setup |
| WorkspaceListScreen | 2 | Browse workspaces, search, create (desktop-only) |
| WorkspaceDetailScreen | 2 | Workspace overview, recent chats, files |
| ChatListScreen | 2 | All conversations across workspaces |
| ChatScreen | 2 | Active conversation, message input, streaming |
| AgentListScreen | 2 | Browse agents, see status at a glance |
| AgentDetailScreen | 2 | Agent info, recent tasks, logs |
| AgentMonitorScreen | 2 | Live view of running task agents |
| FileListScreen | 2 | Files in current workspace |
| FileViewerScreen | 2 | View file content, download, share |
| SettingsScreen | 2 | Theme, notifications, account |
| ProviderConfigScreen | 2 | Add/edit provider, test connection |
| SyncSettingsScreen | 3 | Fugoku Cloud sync config |
| NotificationSettingsScreen | 3 | Push notification preferences |

### 3.4 Module Organization

| Module | Owner | Description |
|---|---|---|
| `aiCore` | Agent System Eng | Provider abstraction, streaming, model registry |
| `database` | Backend Eng | Schema, migrations, repositories, sync layer |
| `navigators` | Mobile Eng | Navigation structure, deep linking |
| `services` | Mobile Eng | Provider client, sync, storage, notifications |
| `store` | Mobile Eng | Zustand state, persistence, hydration |
| `components` | UI Designer + Mobile Eng | Mobile UI library |
| `shared` | All | Tokens, types, utilities shared with desktop monorepo |

---

## 4. Core Screens

### 4.1 Workspace List

**Layout:** Full-screen list with search bar at top, workspace cards below.

**Card shows:**
- Workspace name + description
- Last activity timestamp
- Unread indicator (if any)
- Agent count / file count (small badges)

**Interactions:**
- Tap → open workspace detail
- Long press → context menu (rename, archive — these sync to desktop)
- Pull to refresh (when sync is active)

**Mobile considerations:**
- Search is the primary navigation (don't show 50 workspaces in a scroll)
- Show recently active workspaces pinned at top
- Create new workspace is desktop-only (show a message directing to desktop)

### 4.2 Chat Interface (Mobile-Optimized)

**Layout:**
- Full-screen message list with sticky input at bottom
- Input area: text field + attachment button + send button
- Messages: user messages right-aligned, agent messages left-aligned with avatar
- Streaming indicator: subtle pulse on agent message while generating

**Message rendering:**
- Markdown with syntax highlighting (code blocks)
- Artifacts shown as cards with "Open" / "Download" actions
- Tool calls shown as expandable collapsible sections
- Streaming: character-by-character with auto-scroll

**Mobile-specific optimizations:**
- Voice input button (primary input alternative)
- Quick actions: "Regenerate", "Copy", "Thumbs up/down" — swipeable message actions
- Attachment picker: photo, document, camera
- Keyboard handling: auto-scroll to input when keyboard opens, collapse on scroll up
- Reach: input bar always accessible above keyboard (use `KeyboardAvoidingView` or `react-native-keyboard-controller`)

### 4.3 Agent Interaction

**Phase 2 (View + Monitor):**
- Agent list: name, status badge (idle/running/completed/failed), last task
- Agent detail: config overview (model, tools, permissions), recent task history
- Agent monitor: live-updating list of running task agents with progress

**Phase 3 (Full interaction):**
- Spawn simple task agents from chat
- Voice-triggered agents ("Hey Dusk, summarize this thread")
- Agent suggestions based on context

**Mobile-specific:**
- Notification when agent completes task
- Quick status glance: colored dot = status
- No complex agent configuration on mobile

### 4.4 File Viewer

**Layout:**
- Full-screen viewer with header (filename, actions)
- Support: images, PDFs (via `expo-document-viewer`), markdown, code, plain text
- Share sheet: export via native share

**Interactions:**
- Pinch to zoom (images)
- Swipe between files (gallery mode)
- Download to device
- Copy text from code files

**Mobile-specific:**
- Camera capture → save as new file in workspace
- Gallery picker → attach to chat message
- No file creation/editing (view only on mobile)

### 4.5 Settings

**Sections:**
- Appearance: light/dark/system theme, font size
- Notifications: push toggle, agent completion alerts
- Providers: list configured providers, add new, test connection
- Storage: local DB size, clear cache
- Sync: Fugoku Cloud connect (Phase 3), sync status
- About: version, license, privacy policy

**Mobile-specific:**
- Face ID / Touch ID for app unlock (if provider keys are stored locally)
- Biometric prompt before showing provider keys
- App-level encryption for sensitive settings

---

## 5. Provider Integration

### 5.1 @ai-sdk/* Multi-Provider Approach

**Same abstraction as desktop:** Dusk desktop uses `@ai-sdk/*` packages. Mobile ports the same provider abstraction layer.

**Supported providers (Phase 2):**
- `@ai-sdk/openai` (OpenAI + compatible endpoints)
- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@ai-sdk/mistral`
- `@ai-sdk/xai`
- `@ai-sdk/cerebras`
- `@ai-sdk/perplexity`
- `@ai-sdk/huggingface`

**Fugoku Gateway (Phase 2+):**
- `@ai-sdk/gateway` — routes through Fugoku Gateway for unified billing/fallback
- Shown as a first-class provider in mobile config

**Custom endpoints:**
- Users can add OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, etc.)
- Mobile validates endpoint with a test request before saving

### 5.2 Streaming on Mobile

**Implementation:**
- `@ai-sdk/*` providers support streaming via `streamText`
- Mobile uses native fetch with `ReadableStream` (React Native supports fetch + streams)
- Dusk-studio-app uses `react-native-sse` + custom streaming — evaluate if needed
- For long-running streams: keep-alive pings, reconnect logic

**Mobile streaming UX:**
- Show streaming characters in real-time
- "Stop generating" button always visible during stream
- If stream drops: auto-retry from last checkpoint (if provider supports)
- Network interruption: queue message, send when connection resumes

### 5.3 Offline Support

**Phase 2:**
- View cached conversations and files while offline
- Queue messages sent while offline (send when connection resumes)
- Show offline banner when no network

**Phase 3:**
- Full offline mode: chat with local models (Ollama, etc.)
- Background sync when connection resumes
- Conflict resolution: last-write-wins for message ordering, merge for artifacts

---

## 6. Sync Strategy

### 6.1 How Mobile Syncs with Desktop (When Fugoku Cloud is Ready)

**Phase 2: No sync.** Mobile is standalone, local-first. Workspace data lives only on device. Desktop and mobile are separate instances.

**Phase 3: Fugoku Cloud sync.**
- Sync triggers: app foreground, periodic background, manual pull-to-refresh
- Sync direction: bidirectional (desktop → mobile, mobile → desktop)
- Conflict resolution: operational transforms for chat messages, version vectors for files

### 6.2 Local-First Mobile Architecture

```
┌─────────────────────────────────────┐
│          Mobile App                 │
│  ┌───────────────────────────────┐  │
│  │        Zustand Stores         │  │
│  │  (in-memory, reactive)       │  │
│  └──────────────┬────────────────┘  │
│                 │                   │
│  ┌──────────────▼────────────────┐  │
│  │     Persistence Layer         │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   MMKV (settings, keys) │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   SQLite (Drizzle)      │  │  │
│  │  │   - workspaces          │  │  │
│  │  │   - chats               │  │  │
│  │  │   - messages            │  │  │
│  │  │   - agents              │  │  │
│  │  │   - files               │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│                 │                   │
│  ┌──────────────▼────────────────┐  │
│  │     Network Layer             │  │
│  │  - Provider API calls         │  │
│  │  - Sync (Phase 3)             │  │
│  │  - Push notifications (Phase 3)│  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Principles:**
- All reads go to SQLite first (offline-first)
- Network calls are side effects, not blocking
- Provider API keys stored encrypted (Keychain on iOS, Keystore on Android)
- SQLite is the source of truth locally

### 6.3 Conflict Resolution

**Phase 3 only (requires Fugoku Cloud):**

| Data Type | Conflict | Resolution |
|---|---|---|
| Chat messages | Same message edited on desktop + mobile | Last-write-wins with timestamp + device ID |
| Workspace metadata (name, description) | Edited on both | Last-write-wins, show conflict banner if divergent |
| Files | File modified on both | Version vector: keep both, merge if possible, show conflict if not |
| Agent config | Edited on both | Desktop wins (mobile is read-only for agent config) |
| Provider keys | Different keys on each device | Prompt user to reconcile; don't auto-merge secrets |

**Sync protocol:**
- Use Fugoku Cloud sync API (TBD — depends on cloud API design)
- Incremental sync: only changed records since last sync timestamp
- Delta-based: not full workspace dumps
- Backoff + retry on failure
- Sync status visible in UI ("Last synced 2 min ago")

---

## 7. Platform Considerations

### 7.1 iOS vs Android Differences

**Shared (both platforms):**
- Same React Native codebase (Expo handles differences)
- Same navigation, same state management, same DB schema
- Same provider abstraction

**iOS-specific:**
- Face ID / Touch ID for app unlock and keychain access
- `expo-sqlite` uses native SQLite (not WASM)
- Haptic feedback via `expo-haptics` for interactions
- SF Symbols via `expo-symbols` for icons (or use lucide-react-native for consistency)
- Live Activities (Phase 3): show agent progress on lock screen
- Widgets (Phase 3): workspace quick-view, agent status

**Android-specific:**
- BiometricPrompt via `expo-authentication`
- `expo-intent-launcher` for opening files in other apps
- Back button handling: override React Navigation's default for proper Android back behavior
- Notification channels for Phase 3 push notifications
- Adaptive icons + splash screen per EAS config

**Design differences:**
- iOS: larger safe areas, notch/Dynamic Island handling
- Android: system bar theming, material you color extraction
- Platform-specific swipe gestures (iOS: swipe back; Android: system back)

### 7.2 EAS Build Configuration

**eas.json:**

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "app-bundle" }
    },
    "production": {
      "ios": { "simulator": false },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "...", "track": "internal" }
    }
  }
}
```

**Build profiles:**
- `development`: dev client for internal testing (Expo Go or dev build)
- `preview`: internal distribution (TestFlight / internal testing)
- `production`: App Store / Play Store release

**OTA updates:**
- `expo-updates` enabled for bug fixes and minor changes
- Native code changes require full rebuild via EAS

### 7.3 App Store Compliance

**iOS (App Store):**
- Follow App Store Review Guidelines
- AI-generated content disclosure: if agents produce content, app must disclose AI involvement
- Privacy policy URL required
- Account deletion mechanism required if accounts exist
- No hidden tracking
- In-app purchases: if paid tier exists, use StoreKit (Phase 3)

**Android (Play Store):**
- Privacy policy URL required
- Data safety form: declare data collection (provider keys stored locally = "not collected")
- Target API level: latest stable (34+ at time of build)
- 64-bit requirement: satisfied by Expo
- App signing: use Google Play App Signing

**Content compliance:**
- Dusk is a productivity tool, not a social app or game
- No user-generated content displayed publicly (all workspace content is private/local)
- Minimal permissions: no camera/mic unless user initiates action

---

## 8. What to Rebuild from Desktop

### 8.1 Shared Code Strategy (Monorepo Packages)

**pnpm monorepo** (matches desktop):

```
packages/
  shared/                    # NEW — shared between desktop + mobile
    src/
      tokens/                # Design tokens (colors, type, spacing, motion)
      types/                 # Core domain types (portable TypeScript)
      utils/                 # Pure utility functions (formatters, validators)
      index.ts
  desktop/                   # Desktop app (Phase 1)
  mobile/                    # Mobile app (Phase 2+)
```

**Shared package contents:**
- `tokens/colors.ts` — Dusk color system as CSS variables (desktop) + RN style objects (mobile)
- `tokens/typography.ts` — Font families, sizes, weights, line heights
- `tokens/spacing.ts` — Spacing scale (4px base)
- `tokens/motion.ts` — Animation durations, easing curves
- `types/workspace.ts` — Workspace, Project, Chat interfaces
- `types/chat.ts` — Message, Thread, Attachment interfaces
- `types/agent.ts` — Agent, Task, Specialist interfaces
- `types/provider.ts` — Provider config, Model interfaces
- `utils/formatters.ts` — Date, markdown, file size formatting
- `utils/validators.ts` — URL, email, API key validation

**NOT shared:**
- UI components (different rendering targets)
- State management (different libraries, different persistence)
- Database layer (different SQLite drivers)
- Navigation (different libraries)
- Platform-specific code

### 8.2 Component Reuse vs Rebuild Decision Matrix

| Component | Desktop Tech | Mobile Tech | Decision | Rationale |
|---|---|---|---|---|
| Button | shadcn/ui + HTML | React Native `Pressable` | **Rebuild** | Different interaction model (hover, focus on desktop) |
| Card | shadcn/ui + HTML | React Native `View` | **Rebuild** | Layout differences (CSS flex vs RN flexbox) |
| Input | shadcn/ui + HTML | React Native `TextInput` | **Rebuild** | Platform keyboard behavior differs |
| Markdown renderer | react-markdown | react-native-markdown-display | **Rebuild** | Different rendering engine |
| Code block | react-syntax-highlighter | react-native-code-highlighter | **Rebuild** | Different syntax highlighter libraries |
| Avatar | shadcn/ui | React Native `Image` + `View` | **Rebuild** | Simple enough, platform-native |
| Modal | shadcn/ui Dialog | React Navigation modal | **Rebuild** | Navigation-integrated on mobile |
| Date picker | HTML input / shadcn | `@react-native-community/datetimepicker` | **Rebuild** | Platform-native picker |
| Icon | lucide-react | lucide-react-native | **Share tokens** | Same icon set, different component lib |
| Color palette | TailwindCSS vars | StyleSheet / Uniwind | **Share tokens** | Same colors, different application |
| Type definitions | TypeScript | TypeScript | **Share** | Portable, no platform dependency |

**Rule:** If it touches the DOM (desktop) or native views (mobile), rebuild it. If it's pure logic, types, or tokens, share it.

### 8.3 Design System Portability

**Dusk Design System** is defined once, consumed twice:

```
packages/shared/tokens/
  colors.ts          # Dusk twilight palette
  typography.ts      # Font scale
  spacing.ts         # 4px grid
  motion.ts          # Durations, easings

Desktop consumption:
  → TailwindCSS config extends these tokens
  → CSS custom properties
  → shadcn/ui component variants

Mobile consumption:
  → StyleSheet objects (or UniwindCSS)
  → RN StyleSheet.create()
  → Component props that accept token values
```

**Example color token (portable):**

```typescript
// packages/shared/tokens/colors.ts
export const colors = {
  dusk: {
    50: '#f5f3ff',
    100: '#ede9fe',
    // ... twilight scale
    900: '#1e1b4b',
  },
  surface: {
    primary: '#0f0f1a',
    secondary: '#1a1a2e',
    elevated: '#252540',
  },
  text: {
    primary: '#f0f0f5',
    secondary: '#a0a0b0',
    muted: '#606070',
  },
  accent: {
    primary: '#8b5cf6',    // violet
    secondary: '#6366f1',  // indigo
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
} as const;

// Desktop: generates Tailwind classes
// Mobile: generates StyleSheet objects
```

**Typography token (portable):**

```typescript
export const typography = {
  fontFamily: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;
```

---

## 9. Implementation Plan (Phase 2 Execution)

### 9.1 Prerequisites (from Phase 1)

Before starting mobile, Phase 1 must deliver:
- ✅ Desktop app ships (confirms core architecture)
- ✅ Provider abstraction layer stable (`@ai-sdk/*` integration proven)
- ✅ Workspace/chat/agent data models finalized
- ✅ Dusk design system locked (tokens, components, motion)
- ✅ Shared package scaffolded in monorepo

### 9.2 Sprint 1: Project Scaffold (Week 1-2)

- Initialize Expo project in `apps/mobile/`
- Set up pnpm monorepo workspace
- Create `packages/shared` with tokens and types
- Configure EAS (`eas.json`, build profiles)
- Set up Drizzle + expo-sqlite schema (mirror desktop tables)
- Set up Zustand stores with MMKV persistence
- Configure React Navigation (tabs + stacks)
- Set up CI (GitHub Actions: lint, typecheck, test, EAS build trigger)

### 9.3 Sprint 2: Core Screens (Week 3-5)

- Welcome screen + onboarding
- Workspace list + detail
- Chat list + chat screen with streaming
- Agent list + agent detail
- Settings + provider config
- File list + file viewer
- Markdown rendering, code highlighting, artifact cards

### 9.4 Sprint 4: Polish + Beta (Week 7-8)

- Theme support (dark/light, Dusk palette)
- Offline mode
- Error handling, loading states, empty states
- Haptic feedback, animations
- i18n scaffolding (English first, expand later)
- Internal beta (TestFlight + internal testing)

### 9.5 Sprint 5: Pre-Launch (Week 9-10)

- EAS production build
- App Store Connect setup + TestFlight
- Play Console setup + internal testing
- Privacy policy, terms of service
- App store assets (screenshots, descriptions, previews)
- Analytics (minimal — opt-in crash reporting)

### 9.6 Phase 3: Sync + Cloud (TBD)

- Fugoku Cloud sync API integration
- Push notifications (OneSignal, Expo Notifications, or native)
- Background sync agents
- Voice input, camera capture
- Team workspace support
- Widgets, Live Activities, app clips

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| React Native performance with streaming | Medium | Medium | Profile early, use native driver for animations, optimize list rendering (FlashList) |
| Drizzle schema drift between desktop/mobile | Medium | High | Shared schema source of truth in `packages/shared`, generate for each platform |
| iOS/Android UX divergence | Medium | Medium | Platform-specific components, test on both early |
| App store rejection (AI disclosure) | Low | High | Clear AI labeling in UI, privacy-first design |
| Dusk-studio-app AGPL confusion | Low | Medium | Zero code reuse, cleanroom design, clear attribution |
| Mobile scope creep | High | High | Strict phase gates, desktop-first priority |
| Streaming reliability on mobile networks | Medium | Medium | Exponential backoff, message queuing, partial retry |

---

## 11. Success Metrics (Mobile)

**Phase 2 Beta:**
- App passes TestFlight/internal testing with 0 critical crashes
- Chat streaming works reliably on iOS + Android
- SQLite persistence survives app restart, reinstall (with backup)
- App store review accepted on first submission

**Phase 3 Launch:**
- App Store + Play Store live
- Push notifications deliver reliably
- Cloud sync completes within 30s of foreground
- Mobile session time: 5-10 min average (companion, not primary)

---

*This strategy is executable when Phase 1 delivers. Update sync section when Fugoku Cloud API is designed.*
