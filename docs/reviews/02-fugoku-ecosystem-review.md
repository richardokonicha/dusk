# 02 — Fugoku Ecosystem Review

**Reviewer:** Ecosystem Integration Agent  
**Date:** 2026-08-11  
**Scope:** Standalone vs Fugoku capability matrix, Gateway integration, Cloud on-ramp

## Verdict: APPROVED with one structural concern

### What works

- **Standalone-first is correctly emphasized.** The capability matrix in `standalone-vs-fugoku.md` is clean and unambiguous. Dusk works with zero Fugoku dependencies.
- **Fugoku Gateway as provider preset** is the right integration pattern. It lowers friction — users add it like any other provider, not as a separate onboarding flow.
- **Upgrade messaging** ("Gateway is an upgrade, not a tollgate") is consistent across vision, roadmap, and GTM. Good alignment.
- **Two revenue surfaces** (Dusk independent + Fugoku funnel) is a sound business model.

### Critical concern

**1. Fugoku Gateway integration is Phase 2, but Phase 1 doesn't prepare for it.**

The current Phase 1 architecture has no abstraction for "routed providers." When Phase 2 adds Fugoku Gateway, we'll need to:
- Route agent requests through a gateway provider with fallback logic
- Surface unified billing/usage in the UI
- Handle gateway-specific auth (tokens vs API keys)

If the provider system in Phase 1 doesn't support a "routing layer" concept, we'll need a Phase 2 refactor.

**Recommendation:** Add a `ProviderRouter` interface to the Phase 1 provider system. Even if it's a no-op in Phase 1, the interface ensures Phase 2 can plug in Fugoku Gateway without rewriting the provider layer.

```typescript
interface ProviderRouter {
  route(request: RouteRequest): Promise<RouteResult>;
  getProviders(): ProviderInfo[];
  getUsage(): UsageSummary;
}

// Phase 1: direct router (pass-through)
class DirectRouter implements ProviderRouter { ... }

// Phase 2: Fugoku Gateway router
class FugokuGatewayRouter implements ProviderRouter { ... }
```

### Medium concerns

- **Cloud sync is Phase 3, but the data model doesn't support versioning.** The `files` table has no version column. When sync arrives, we'll need operational transforms or at minimum version vectors. Add a `version` column now while the schema is still fluid.
- **Team workspaces are Phase 3, but workspace sharing needs permissions.** The current `AgentPermissions` model is per-agent. When teams arrive, we'll need workspace-level permissions (owner, editor, viewer). Consider adding a `WorkspaceMember` table in Phase 1 as a stub.

### Minor concerns

- **Fugoku branding separation:** Ensure no Fugoku logo/identity appears in Dusk until the Gateway integration actually ships. Premature co-branding confuses standalone positioning.
