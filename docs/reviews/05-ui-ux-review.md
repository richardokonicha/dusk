# UI/UX Review — Dusk Work OS

**Date:** 2026-08-11  
**Reviewer:** Kilo (Senior UX Reviewer)  
**Scope:** design-system.md, frontend-plan.md, agents.md, vision.md vs Cherry Studio reference implementation

---

## 1. Design System Completeness

### What exists
Dusk defines the basics: a color palette (Dusk Twilight + Warm Amber + Neutral), typography scale, spacing tokens, border radii, a 12-column grid, motion durations, and shadow values. The component list in §3 is reasonable in scope — AppShell, Sidebar, Chat, Forms, Feedback, Overlays, Data Display.

### What's missing or superficial

**No semantic token layer.** Cherry Studio's DESIGN.md establishes a semantic vocabulary: `background` / `card` / `popover` / `sidebar` as surfaces; `foreground` / `muted-foreground` / `foreground-tertiary` / `foreground-disabled` as text roles; `border` / `border-subtle` / `border-strong` / `border-selected` / `input` / `ring` as structure; `primary` / `destructive` / `success` / `warning` / `info` / `error` as action roles; `chart-1` through `chart-5` for data. Dusk uses raw color names (`--dusk-500`, `--amber-400`, `--gray-800`) and ad-hoc aliases (`--bg-primary`, `--text-secondary`, `--border`). Every component will end up choosing between raw semantic names, leading to inconsistency.

**No state tokens.** Dusk defines `hover`, `active`, `disabled` only as interaction patterns in prose (§3.3). There are no CSS custom properties for `--color-hover`, `--color-active`, `--color-disabled`, `--color-focus-ring`, `--color-selected`, `--color-invalid`. Cherry encodes these as semantic tokens so components never hardcode opacity or color shifts.

**No elevation / z-index scale.** Shadows are defined (`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`) but there is no z-index token system. Modals, tooltips, popovers, dropdowns, toasts, and the global search popup all need a shared elevation contract. Cherry manages this through component-level z-index and overlay primitives.

**No empty / skeleton / error state tokens.** Dusk lists `EmptyState` nowhere. Cherry has `EmptyState` presets (`default`, `no-result`) and `InlineSkeleton`. A professional workspace app needs these for every data-loading surface.

**No divider token.** Cherry uses `border-subtle` and a dedicated `Separator` component. Dusk has no divider token or separator component in its plan.

**No icon sizing system.** Cherry uses `[&_svg]:size-4` as a baseline, with `size-3.5` for compact controls. Dusk leaves icon sizing implicit.

**No focus management tokens.** Cherry specifies focus-visible must reuse existing border/fill vocabulary — no positive outline offsets, no focus shadows beyond bounds. Dusk's §3.3 says "2px ring in accent color, 2px offset" — this violates Cherry's established pattern and will look unprofessional.

### Verdict
The token set is ~50% of what's needed for a professional implementation. It defines primitives but not semantics. Every downstream component decision will require ad-hoc color choices.

---

## 2. Cherry Studio UI Gaps

Cherry Studio v2 has patterns that Dusk has not planned at all:

### Message block architecture
Cherry renders messages as composable blocks: `MainTextBlock`, `ThinkingBlock` (collapsible, gradient-styled, opens detail sheet), `ImageBlock` (with skeleton placeholder), `ToolBlock` (with `MessageTools`), `CitationBlock`, `TranslationBlock`, `ErrorBlock`, `PlaceholderBlock`. Each block has status (`PENDING`, `STREAMING`, `DONE`, `ERROR`). Dusk's `MessageBubble` is monolithic — a single `Markdown` render with no block-level structure. This means Dusk cannot render thinking traces, tool execution steps, or image generations as structured inline content.

### Global search / command palette
Cherry has `GlobalSearchPopup` (lazy-loaded, 80vh dialog) with grouped results (recent routes, conversations, files, messages). Dusk lists `Ctrl/Cmd + K` in keyboard shortcuts but has no component plan for the command palette itself.

### Artifact / preview pane
Cherry has `ArtifactPane`, `HtmlArtifactView`, `CodeViewer` — a right-side panel that renders code, HTML previews, and other structured outputs. Dusk's right panel is described only as "context-dependent (agent details, file preview, conversation info)" with no component plan for artifact rendering.

### Citation system
Cherry has `CitationsPanel`, `WebCitation`, `KnowledgeCitation` — inline citation references that open a panel. Dusk has no citation concept.

### Context usage meter
Cherry has `ContextUsageMeter` with color-coded segments showing token consumption. Dusk's agent status indicators (§4.3) don't include cost or token transparency, which agents.md lists as a professional requirement.

### Selection / action system
Cherry has a full action registry (`actionRegistry`), `ActionMenu`, `ActionConfirmDialog`, `SelectionActionIcon`, `SelectionToolbarView`, `ResourceListActionContextMenu` — enabling consistent multi-select with contextual actions across files, conversations, and agents. Dusk has no selection/action pattern.

### Tab-based navigation with detachable windows
Cherry has `TabRouter`, `TabIdProvider`, `TabsProvider`, `useTabs` — supporting pinned tabs, detachable sub-windows (used for file preview, mini-apps), tab reordering, and dormant tab keep-alive. Dusk's routing is simple nested routes with no tab abstraction.

### Pane auto-collapse
Cherry's `ChatAppShell` has `useResourceListAutoCollapse` with hysteresis, manual-expand suppression, drag exemption, and width prediction. Dusk's `AppShell` is a static three-column layout with no responsive pane behavior.

### Onboarding / import
Cherry has `WelcomeScreen`, `ImportDataSheet` (imports from ChatGPT, Anthropic, etc.). Dusk has `WelcomeScreen.tsx` and `Onboarding.tsx` in the file tree but no content plan for what onboarding covers or how data import works.

### Image viewer
Cherry has `ImageViewer` for full-screen image preview. Dusk lists `FilePreview` but no dedicated image viewer.

### Markdown editor
Cherry has `MarkdownEditor` for editing markdown content inline. Dusk has no editor component plan.

### Model / capability tags
Cherry renders `ModelTag`, `VisionTag`, `AudioTag`, `VideoTag`, `ReasoningTag`, `EmbeddingTag`, `ToolsCallingTag`, `WebSearchTag`, `RerankerTag`, `FreeTag` on model selection UIs. Dusk has no tag system.

### Composer with prompt variables
Cherry has `PromptVariableToken` and `composerSchema` for inserting variables into prompts. Dusk's `MessageInput` is a plain text input.

### Paste handler
Cherry has `usePasteHandler` for handling pasted images, files, and URLs in the composer. Dusk has no paste strategy.

### Virtual scrolling
Cherry has `DynamicVirtualList`, `GroupedSortableVirtualList`, `GroupedVirtualList` for rendering large conversation and file lists. Dusk's `MessageList` and `FileTree` have no virtualization plan.

### macOS traffic light integration
Cherry has `SubWindowTitleBar`, `SubWindowControls`, `useMacTransparentWindow`, and `data-testid="macos-traffic-light-drag-region"` spacers. Dusk has no platform-specific chrome plan.

---

## 3. Professional UX Assessment

### Cherry Studio: professional
Cherry's DESIGN.md reads like a product with a clear philosophy: "calm, precise, and utilitarian," "content before decoration," "surface-based hierarchy." Every rule is actionable. The review checklist is concrete. The component library (`@cherrystudio/ui`) is built on Shadcn UI with custom variants, and the `data-ui` attributes enable automation and custom CSS without breaking encapsulation. The focus management rules (inset rings only, no positive outline offsets) are specific enough to implement correctly.

### Dusk: amateur-leaning
Dusk's design system reads like a design-system template. The brand identity is generic ("custom geometric sans-serif," "minimal dusk gradient"). The color palette is competently chosen but has no semantic structure — it's a flat list of CSS variables. The layout patterns (§4) use ASCII art but lack the sophistication of Cherry's `ChatAppShell` with its auto-collapse, overlay host, and right pane transitions.

The motion guidelines (§3.4) are copied from Framer Motion docs — `fadeIn`, `slideIn`, `scaleIn`, `pulse` — with no product-specific choreography. Cherry's motion is restrained and explained through state transitions; Dusk's is decorative.

The component API example (§3.2) uses `class-variance-authority` correctly, but the component list mixes atomic components (`Button`, `Input`) with composite components (`AppShell`, `ChatContainer`, `MessageBubble`) without a clear composition strategy. Cherry separates primitives (`@cherrystudio/ui`) from composites (page-level shells) explicitly.

### Specific problems
- The "Dusk Twilight" gradient brand identity is not reflected in the component tokens — `--dusk-500` is used for `--color-accent` but the dark theme backgrounds (`#0f0f1a`, `#1a1a2e`) don't reference the palette at all. The brand and the system are disconnected.
- Dark theme contrast: `--text-secondary: #a0aec0` on `--bg-secondary: #1a1a2e` — need to verify this meets 4.5:1. It likely doesn't for smaller text.
- The "glow" shadow (`--shadow-glow`) is decorative and contradicts Cherry's "content before decoration" principle. It will date quickly.
- No error state design. No invalid state design. No loading state beyond a spinner.

---

## 4. Accessibility

### What Dusk claims
§5.1 lists WCAG 2.1 AA targets: 4.5:1 contrast, 2px focus ring, keyboard navigation, ARIA labels, 200% zoom, `prefers-reduced-motion`. Keyboard shortcuts are listed in §5.2.

### What Dusk actually plans
- **Contrast:** No contrast validation is planned. No tooling, no test, no CI check. The dark theme `#a0aec0` / `#1a1a2e` pair should be audited — preliminary check suggests it fails for 14px text.
- **Focus:** "2px ring in accent color, 2px offset" — this violates Cherry's focus principle (inset only, no positive offset, no shadow beyond bounds). The 2px offset creates visual noise and breaks surface alignment.
- **ARIA:** "ARIA labels on all interactive elements" is stated but not structured. No plan for `aria-live` regions for streaming responses, agent status changes, or toast notifications. No plan for `role="log"` on the message list. No plan for `aria-busy` on the composer during streaming.
- **Keyboard navigation:** The shortcut list is good but incomplete. No plan for navigating message actions (copy, edit, delete) via keyboard. No plan for navigating the sidebar with arrow keys. No plan for focus trap in modals/drawers.
- **Reduced motion:** `prefers-reduced-motion` is mentioned in motion guidelines but not in the ThemeProvider — there's no mechanism to disable animations at the system level.
- **Screen reader:** No plan for announcing streaming progress, agent state changes (idle → working → awaiting input), or tool execution results. Cherry uses `NotificationService` for system-level notifications; Dusk has no equivalent.
- **Zoom:** "Support up to 200% zoom without loss of content" — no responsive strategy is documented. Cherry's layout responds to available space; Dusk's fixed 240px sidebar + 320px right panel will break at high zoom levels.
- **Touch targets:** No minimum touch target size defined. Cherry's mobile app uses `useSafeArea` and platform-specific sizing; Dusk has no mobile plan at all.

### Verdict
Accessibility is stated as a requirement but treated as a checkbox, not a design constraint. The focus ring specification is actively wrong. There is no testing or validation plan.

---

## 5. Theme System

### What Dusk plans
§6 defines a `ThemeDefinition` interface, a `ThemeContext` with `setTheme` and `setCustomTheme`, and a custom theme creation flow (color picker, font selection, density adjustment, export/import JSON).

### What Cherry actually does
- **System theme detection:** Cherry reads `prefers-color-scheme`, listens for native OS theme changes via IPC (`system.native_theme_updated`), and migrates legacy theme values.
- **Theme toggle cycle:** Cherry cycles `light → dark → system → light` with a single toggle action.
- **User theme:** Cherry has `useUserTheme` for custom CSS injection (allowing power users to override styles).
- **Density:** Not explicitly planned in Cherry, but the component library uses consistent spacing that could be parameterized.
- **Font scaling:** Cherry's typography is token-based but doesn't expose font-size adjustment to users.

### Gaps in Dusk
- **No system theme detection planned.** The ThemeProvider example in §6.2 doesn't listen to `prefers-color-scheme` or OS changes. First-run users on macOS with Dark Mode will see a flash of light theme.
- **No theme migration strategy.** If the token names change (they will), there's no plan for migrating saved user preferences.
- **No high contrast mode.** Windows users in high contrast mode will see broken UI because Dusk uses raw color values that don't respond to `forced-colors`.
- **Density is mentioned but not designed.** "Compact/comfortable/spacious" is listed as a user option in §6.3 but no spacing scale variants are defined. Cherry doesn't have this either, but Cherry's spacing is consistent enough that it could be added.
- **No theme preview.** Users can't preview a theme before applying it. Cherry doesn't have this either, but it's a standard expectation for theme marketplaces.
- **Custom theme is incomplete.** The `ThemeDefinition` interface doesn't include semantic colors (success, warning, error, info, destructive). A user creating a custom theme can't set these, so they'll fall back to hardcoded values.
- **No i18n in the theme settings.** Cherry has full i18n coverage; Dusk's theme settings would need translation keys for "Light," "Dark," "System," "Custom," "Density," etc.

### Verdict
The theme system is a prototype — it defines the API but not the behavior. It will need significant rework to match Cherry's system-theme integration and to avoid flash-of-wrong-theme on first render.

---

## 6. Mobile UX

### What Dusk plans
Nothing. The frontend plan (§1 project structure) has `packages/desktop/` and `packages/renderer/` only. The vision.md says "desktop-first (lineage: Cherry Studio)" but doesn't address whether mobile is a future goal or explicitly out of scope.

### What Cherry has
Cherry Studio has a full mobile app (`cherry-studio-app/`) built with React Native + Expo:
- **Responsive breakpoints:** `useResponsive` distinguishes phone vs tablet (600dp threshold) and portrait vs landscape.
- **Safe area handling:** `useSafeArea` with Android initial-window-metrics fallback.
- **Swipe gestures:** Right swipe opens drawer, left swipe navigates to topic list.
- **Keyboard avoiding:** `KeyboardController` + `KeyboardAvoidingView` with platform-specific offsets.
- **Bottom sheets:** `CitationSheet`, `ThinkingDetailSheet` for contextual overlays.
- **Touch-optimized targets:** Mobile components use larger hit areas and platform-specific feedback.
- **LAN transfer:** Direct device-to-device file transfer via local network.
- **Different navigation model:** Stack-based (not tab-based like desktop), with drawer for settings.

### The gap
Dusk's desktop layout has a 240px sidebar, 320px right panel, and complex multi-pane chat shell — none of which translates to mobile. Without a mobile plan:
- The workspace concept (files + agents + chat) cannot be navigated on a phone.
- The right panel (agent details, file preview) has no mobile equivalent.
- The agent lifecycle (idle/working/awaiting) needs simplified mobile status indicators.
- File management (drag-and-drop upload, batch operations) has no mobile input model.

### Verdict
Mobile is not planned, not scoped, and not mentioned. This is acceptable for an MVP if it's an explicit non-goal — but vision.md and agents.md don't state this. The design system should at minimum define responsive breakpoints and a mobile-first strategy for the core chat surface, even if the full desktop feature set doesn't ship on mobile initially.

---

## 7. Priority Fixes

Ranked by impact on user experience and implementation dependency:

### P0 — Must fix before implementation starts

1. **Redesign the token system around semantic roles.** Replace the flat color list with Cherry's semantic vocabulary: `background`, `background-subtle`, `card`, `popover`, `sidebar`, `foreground`, `muted-foreground`, `foreground-tertiary`, `foreground-disabled`, `primary`, `primary-foreground`, `destructive`, `destructive-foreground`, `success`, `warning`, `info`, `error`, `error-subtle`, `border`, `border-subtle`, `border-strong`, `border-selected`, `input`, `ring`, `link`, `chart-1` through `chart-5`. Define state tokens (`--color-hover`, `--color-active`, `--color-disabled`, `--color-focus-ring`, `--color-selected`, `--color-invalid`) as CSS custom properties.

2. **Fix the focus ring specification.** Replace "2px ring in accent color, 2px offset" with inset-only focus indicators. Use `focus-visible` with ring offset 0, or change border/background of the existing control. No positive outline offsets. This is both an accessibility requirement and a visual quality issue.

3. **Define state components.** Plan `EmptyState` (with presets), `Skeleton` / `InlineSkeleton`, `ErrorBoundary` (Cherry has one), and `Toast` / `Alert` with proper ARIA live regions. These are needed for every data surface.

4. **Add system theme detection to ThemeProvider.** Read `prefers-color-scheme` on mount, listen for OS changes, and avoid flash-of-wrong-theme by computing initial theme before first render.

### P1 — Must fix before v0.1 ships

5. **Design the message block architecture.** Replace the monolithic `MessageBubble` with composable blocks: text, thinking (collapsible), tool execution, image, citation, error. Each block needs a status state and ARIA semantics.

6. **Plan the global search / command palette.** At minimum: a `Cmd+K` dialog with recent conversations, agents, and files. Cherry's `GlobalSearchPopup` is the reference.

7. **Plan the artifact / preview pane.** The right panel must render code blocks with syntax highlighting, HTML previews, and file previews. Define `ArtifactPane` and `CodeViewer` components.

8. **Add the selection / action system.** Multi-select with checkbox, contextual action menu, batch operations. Required for files, conversations, and agents.

9. **Define responsive breakpoints.** Even if mobile is deferred, the desktop app must handle window resizing from 1024px to 1440px+. Cherry's `evaluateAutoCollapse` and `predictCenterWidth` handle this; Dusk's fixed 240px/320px columns will not.

10. **Add i18n to the component plan.** Cherry has i18n validation in CI. Dusk has no i18n plan at all. Every user-visible string in the component examples (§3.2) is hardcoded English.

### P2 — Important for professional quality

11. **Establish a visual philosophy.** Replace "custom geometric sans-serif" and "minimal dusk gradient" with concrete decisions. Cherry's "neutral first, content before decoration" is a philosophy that guides every component decision. Dusk needs one too — currently it feels like a design-system starter template.

12. **Add model/capability tags.** The agent system (§agents.md) references model selection and tool permissions. The UI needs visual tags for model capabilities (vision, audio, video, reasoning, tools, web search, embedding) — Cherry has these as a component family.

13. **Design the onboarding flow.** The `WelcomeScreen` and `Onboarding` components exist in the file tree but have no content plan. What does a new user see? How do they add their first provider? Cherry's `WelcomeScreen` + `ImportDataSheet` is the reference.

14. **Add virtual scrolling.** The `MessageList` and `FileTree` will hit performance walls without virtualization. Cherry uses `DynamicVirtualList` and `GroupedSortableVirtualList`.

15. **Plan macOS-specific chrome.** The traffic light drag region, transparent window support, and sub-window management are table stakes for a Mac-native Electron app. Cherry's `SubWindowAppShell` and `useMacTransparentWindow` are the reference.

---

## Summary

Dusk's design system is a competent starting point for tokens and layout, but it lacks the semantic depth, state management, and component architecture of Cherry Studio's mature `@cherrystudio/ui` library. The biggest risks are:

- **The token system is primitive** — it will produce inconsistent components and make theme switching fragile.
- **The chat UI is monolithic** — it cannot support the rich message types (thinking, tools, citations, images) that modern AI workspaces require.
- **Accessibility is stated, not designed** — the focus ring specification is wrong, there are no ARIA live regions, and there's no testing plan.
- **Mobile is invisible** — even a deferred mobile strategy would inform responsive breakpoints and touch target sizing.
- **The visual identity is generic** — "Dusk Twilight" is a competent palette but lacks the cohesive philosophy that makes Cherry feel intentional.

The priority fixes above should be addressed before writing implementation code. The design system needs a v2 pass that establishes semantic tokens, state components, and a clear visual philosophy — then the component plan can be rebuilt on top of it.
