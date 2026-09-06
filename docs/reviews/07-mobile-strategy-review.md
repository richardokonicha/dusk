# 07 — Mobile Strategy Review

**Reviewer:** Mobile Engineering Agent  
**Date:** 2026-08-11  
**Scope:** React Native + Expo strategy, mobile architecture, desktop-to-mobile parity, sync

## Verdict: DEFERRED — sound strategy, but Phase 2 timing needs guardrails

### What works

- **React Native + Expo** is the right choice. Dusk Studio's mobile app validates this stack.
- **Drizzle ORM for mobile SQLite** matches the desktop recommendation (once standardized). Same schema, different driver.
- **Shared monorepo package** for design tokens, types, and utilities is the correct approach. No component reuse between HTML/CSS and native — this is architecturally honest.
- **Clear Phase 2 vs Phase 3 scope boundaries.** Read-only mobile in Phase 2, sync in Phase 3. Good guardrails against scope creep.

### Critical concern

**1. Mobile is Phase 2+, but the desktop schema isn't designed for sync.**

The `standalone-vs-fugoku.md` says cloud sync is Phase 3. The `mobile-strategy.md` says mobile is standalone in Phase 2 (no sync). But if mobile is truly standalone, users have completely separate workspaces on desktop and mobile — this creates a **data fragmentation problem** that undermines the "your AI work lives here" value prop.

**Recommendation:** Even in Phase 2 mobile, implement a manual export/import mechanism for workspace bundles. Let users move workspaces between desktop and mobile via file transfer. This isn't sync, but it prevents total data isolation. It also validates the serialization format that Phase 3 sync will use.

### Medium concerns

- **Zustand + MMKV on mobile:** The mobile plan proposes MMKV for persistence, but the desktop uses SQLite. When Phase 3 sync arrives, we'll need to reconcile two persistence layers. Consider using SQLite (via expo-sqlite) as the single source of truth on mobile too, with Zustand as an in-memory cache on top. This aligns desktop and mobile data models.
- **Expo SDK version:** The plan says "~54" without pinning. Expo SDKs have breaking changes between major versions. Pin to a specific version once Phase 1 is stable.
- **Mobile streaming UX:** The plan mentions `react-native-sse` as a fallback. React Native's fetch API supports ReadableStream in newer versions. Test this early — if it doesn't work, SSE is the right choice.

### Minor concerns

- **Biometric auth:** Face ID / Touch ID for app unlock is Phase 2. Plan the keychain integration now so it's not a retrofit.
- **Push notifications:** Phase 3 only. But the notification permission prompt should be requested at first launch in Phase 2, even if notifications aren't used yet (iOS doesn't let you request later if user initially denies).
