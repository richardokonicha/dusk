# 11 — Frontend Plan Review

**Reviewer:** Frontend Engineering Agent  
**Date:** 2026-08-11  
**Scope:** React/Vite implementation plan, component architecture, state management, styling

## Verdict: APPROVED with dependency concerns

### What works

- **Project structure** (packages/desktop + packages/renderer) is clean and matches the monorepo strategy.
- **Zustand for state management** is the right choice for this scale. Lightweight, no boilerplate, works well with TypeScript.
- **shadcn/ui integration** via CLI is practical. Copy-paste components mean no version lock-in.
- **TailwindCSS v4 config** extends correctly with Dusk color tokens.

### Critical concerns

**1. The scaffold script has a bug.**

`frontend-plan.md` line 577 shows `echo '🍒 Dusk — Project Scaffold'`. The dusk emoji and "Dusk" name in the scaffold script must be removed. This is a brand contamination issue — even in a setup script, Dusk references undermine the Dusk brand.

**2. React Router is listed but not in the dependency list.**

`frontend-plan.md` imports `createBrowserRouter` from `react-router-dom` (line 484), but `frontend-plan.md`'s package install section doesn't include `react-router-dom`. The renderer package.json scaffold also omits it.

**Recommendation:** Add `react-router-dom` to the renderer dependencies. Or, since this is an Electron app (not a web app), consider whether routing is even needed. Electron apps typically use a single window with view switching, not URL-based routing. If routing is needed, use `react-router-dom` with `HashRouter` (not `BrowserRouter`) since the renderer loads from `file://` or `app://`.

### Medium concerns

- **Vite config for Electron:** The renderer uses Vite with `@vitejs/plugin-react`. For Electron, the renderer needs to build to a static directory that the main process can load. The current plan assumes `vite build` outputs to `dist/` which the main process loads via `loadFile`. Verify the output paths match.
- **IPC client is duplicated:** `frontend-plan.md` defines an `IPCClient` class in `services/ipc-client.ts`, but `backend-architecture.md` defines the same class. These should be in a shared package, not duplicated.
- **TypeScript path aliases:** The plan uses `@/` and `@desktop/*` aliases. Ensure Vite and TypeScript both resolve these correctly. Vite needs `resolve.alias`, TypeScript needs `paths` in `tsconfig.json`.

### Minor concerns

- **Globals.css structure:** The plan mentions `styles/globals.css` but doesn't define what goes in it. At minimum: CSS reset, custom properties injection, and base element styles.
- **PostCSS config:** `postcss.config.js` is listed but TailwindCSS v4 uses `@tailwindcss/vite` plugin, not PostCSS. Remove the PostCSS config or document why it exists.
