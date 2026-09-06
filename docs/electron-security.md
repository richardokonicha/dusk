# Electron Security Checklist

**Status:** MANDATORY — All items must pass before any release  
**Applies to:** Dusk Work OS desktop shell  
**Rationale:** Dusk Studio published 3 CVEs in 12 months from Electron misconfigurations. Dusk must not repeat these mistakes.

---

## 1. BrowserWindow Security Hardening

Every `BrowserWindow` must use the following `webPreferences`:

```typescript
webPreferences: {
  contextIsolation: true,        // Non-negotiable. Isolates renderer from Node.js.
  nodeIntegration: false,        // Renderer must never have direct Node.js access.
  sandbox: false,                // Phase 1 trade-off for better-sqlite3. Evaluate utilityProcess in Phase 2.
  preload: path.join(__dirname, "../preload/index.js"), // Only trusted preload script.
  webviewTag: false,             // Block webview unless explicitly required by a feature.
  devTools: isDev               // Disable devTools in production.
}
```

### Rationale

| Setting | Requirement | Reason |
|---------|-------------|--------|
| `contextIsolation` | **Required** | Prevents renderer from accessing Node.js globals. Without this, any XSS becomes RCE. |
| `nodeIntegration` | **Required false** | Renderer must not access `require()` or any Node.js API. |
| `sandbox` | **Phase 1: false (documented exception)** | `better-sqlite3` requires this in Phase 1. Document the risk and plan `utilityProcess` migration for Phase 2. |
| `preload` | **Required** | All renderer access to main-process capabilities must go through a whitelisted preload bridge. |
| `webviewTag` | **Required false** | `<webview>` creates a new renderer process with its own privilege level. Eliminate the attack surface unless a feature absolutely requires it. |
| `devTools` | **Production: false** | DevTools expose the full renderer context and can bypass security boundaries. |

---

## 2. Context Isolation Enforcement

- **Rule:** `contextIsolation: true` must be set on every `BrowserWindow`.
- **Verification:** Add a unit test that asserts no window is created with `contextIsolation: false`.
- **Renderer-side:** Never use `window.require`, `window.process`, or `window.electron` without going through `contextBridge`.
- **Global namespace:** Do not attach privileged objects to `window` from the renderer.

---

## 3. Node Integration Disabled

- **Rule:** `nodeIntegration: false` on all windows.
- **Prohibited APIs in renderer:**
  - `require()` / `import()` of Node.js modules
  - `process.env`, `process.cwd()`, `process.argv`
  - `fs`, `path`, `os`, `crypto`, `child_process`
- **Enforcement:** ESLint rule `no-restricted-imports` targeting Node.js built-ins in renderer code.

```typescript
// eslint.config.mjs — renderer
{
  rules: {
    "no-restricted-imports": [
      "error",
      { "name": "fs", "message": "Use preload bridge for file operations" },
      { "name": "path", "message": "Use preload bridge for path operations" },
      { "name": "os", "message": "Use preload bridge for OS info" },
      { "name": "crypto", "message": "Use preload bridge for crypto operations" },
      { "name": "child_process", "message": "Use preload bridge for process execution" }
    ]
  }
}
```

---

## 4. Preload Script Audit

### 4.1 Whitelist Principle

The preload script may only expose APIs that the renderer explicitly needs. Every exposed method must be justified.

### 4.2 Prohibited Exposures

The preload script must **never** expose:
- `fs`, `path`, `os`, `crypto`, `stream`, `buffer` modules
- `ipcRenderer` raw (always use `contextBridge` with typed wrappers)
- `process` object
- `require()` function
- Any `electron` module other than `contextBridge`, `ipcRenderer`, `shell`, `webUtils`

### 4.3 Audit Process

1. Review every export from `preload/index.ts`.
2. Verify each export has a corresponding consumer in renderer code.
3. Verify each consumer passes through Zod validation in the main-process handler.
4. Remove any export with no consumer within 30 days of introduction.

---

## 5. IPC Channel Whitelist

### 5.1 Channel Registry

All IPC channels must be declared in a central enum or const object (`IpcChannel`). No bare string literals.

```typescript
export const IpcChannel = {
  Workspace_List: "workspace:list",
  Workspace_Create: "workspace:create",
  Workspace_Get: "workspace:get",
  Workspace_Update: "workspace:update",
  Workspace_Delete: "workspace:delete",
  Conversation_List: "conversation:list",
  Conversation_Create: "conversation:create",
  Conversation_Get: "conversation:get",
  Conversation_Delete: "conversation:delete",
  Message_List: "message:list",
  Message_Send: "message:send",
  Message_Stream: "message:stream",
  Agent_List: "agent:list",
  Agent_Create: "agent:create",
  Agent_Get: "agent:get",
  Agent_Update: "agent:update",
  Agent_Delete: "agent:delete",
  Agent_Run: "agent:run",
  File_Read: "file:read",
  File_Write: "file:write",
  File_List: "file:list",
  File_Delete: "file:delete",
  Provider_List: "provider:list",
  Provider_Create: "provider:create",
  Provider_Update: "provider:update",
  Provider_Delete: "provider:delete",
  Settings_Get: "settings:get",
  Settings_Set: "settings:set",
  System_Health: "system:health",
  System_OpenExternal: "system:open-external",
} as const;
```

### 5.2 Handler Registration

- All handlers must be registered through a typed wrapper (e.g., `ipcMain.handle(channel, schema, handler)`).
- No handler may accept `...args: any[]`. Every argument must be validated against a Zod schema before the handler body executes.

### 5.3 Sender Validation

Every handler must validate the sender:

```typescript
import { validateSender, isAppRendererUrl } from "@desktop/core/security/validateSender";

ipcMain.handle(IpcChannel.Workspace_List, async (event) => {
  if (!validateSender(event)) {
    throw new Error("Unauthorized IPC sender");
  }
  // ... handler logic
});
```

---

## 6. URL Validation Rules

All URLs opened externally or fetched internally must pass validation.

### 6.1 Allowed Protocols

| Protocol | Allowed | Notes |
|----------|---------|-------|
| `https:` | **Yes** | Default for all external resources |
| `http:` | **No** | Blocked by default. Allow only for explicit local proxy addresses. |
| `file:` | **Conditional** | Only when the path is inside the app's own bundle or user-workspace directory. |
| `mailto:` | **Yes** | Limited to email links |
| `data:` | **No** | XSS risk. Block entirely. |
| `javascript:` | **No** | Always block. |
| `blob:` | **No** | Renderer-internal only. Never passed to `shell.openExternal`. |
| `custom:` | **Conditional** | Only if explicitly registered by the app (e.g., `dusk:` scheme). |

### 6.2 SSRF Prevention

- Block private/reserved IP ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`.
- Block `localhost` and `127.0.0.1` unless explicitly whitelisted for local proxy.
- Block cloud metadata endpoints: `169.254.169.254` (AWS, GCP, Azure).
- Resolve DNS before fetching and validate the resolved IP against the blocklist.

### 6.3 Implementation

```typescript
import { URLValidator } from "@desktop/security/url-validator";

const validator = new URLValidator({
  allowedProtocols: ["https:", "file:", "mailto:", "dusk:"],
  allowedHosts: ["localhost"], // Only for local proxy
  blockPrivateIPs: true,
  blockCloudMetadata: true,
});

// Validate before opening
const result = validator.validate("https://example.com/api");
if (!result.valid) {
  throw new Error(result.reason);
}
```

---

## 7. CSP Configuration

### 7.1 Production CSP

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.mistral.ai https://api.x.ai https://api.deepseek.com https://api.perplexity.ai https://api.cerebras.ai https://api.together.xyz https://api.fireworks.ai https://api.fugoku.ai;
  frame-src 'none';
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  upgrade-insecure-requests;
```

### 7.2 Nonce Generation

- Generate a unique nonce per session or per page load.
- Inject nonce into `<script>` and `<style>` tags via the preload or main process.
- Never reuse nonces across sessions.

```typescript
import { generateNonce } from "@desktop/security/csp";

const nonce = generateNonce(); // Crypto.randomUUID() or crypto.getRandomValues()
mainWindow.webContents.executeJavaScript(`
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; ...";
  document.head.appendChild(meta);
`);
```

### 7.3 Connect-src Allowlist

The `connect-src` directive must whitelist all provider API endpoints plus any backend services. No wildcards.

---

## 8. Secure Storage Requirements

### 8.1 API Key Storage

- **Never** store API keys in plaintext files, localStorage, or unencrypted SQLite.
- **Must** use Electron `safeStorage` (OS-native encryption):
  - macOS: Keychain
  - Windows: DPAPI
  - Linux: libsecret / GNOME Keyring
- **Encryption target:** The **value** is encrypted, not the key name.

```typescript
// CORRECT
async set(key: string, value: string): Promise<void> {
  const encrypted = safeStorage.encryptString(value);
  await db.set(key, encrypted);
}

async get(key: string): Promise<string | null> {
  const encrypted = await db.get(key);
  if (!encrypted) return null;
  return safeStorage.decryptString(encrypted);
}
```

### 8.2 Migration from Plaintext

If existing installations have plaintext API keys:
1. On first launch after update, detect plaintext values.
2. Encrypt them using `safeStorage`.
3. Overwrite the plaintext values.
4. Log migration completion.

### 8.3 Platform Notes

| Platform | Backend | Notes |
|----------|---------|-------|
| macOS | Keychain | Requires user login. If user logs out, keys are unavailable. |
| Windows | DPAPI | Tied to user account. Migrates with user profile. |
| Linux | libsecret | Requires `gnome-keyring` or `kwallet` running. Fallback: prompt user. |

---

## 9. MCP Trust Model

### 9.1 Threat Model

MCP servers are third-party code that execute with tool access to the workspace. A compromised or malicious MCP server is a workspace-wide security incident.

### 9.2 User Approval Flow

1. **Discovery:** User adds an MCP server via URL or local path.
2. **Manifest inspection:** The app fetches the server manifest (if available) and displays capabilities, tools, and resource access.
3. **Explicit approval:** User must click "Approve" before any tool call is allowed.
4. **Granular permissions:** User can approve specific tools and deny others.

### 9.3 Permission Granularity

| Permission | Description |
|------------|-------------|
| `file:read` | Read workspace files |
| `file:write` | Write to workspace files |
| `file:delete` | Delete workspace files |
| `network:outbound` | Make external network requests |
| `network:inbound` | Accept inbound connections (rare) |
| `system:execute` | Execute system commands |
| `agent:control` | Control agent execution |

### 9.4 Audit Logging

Every MCP action must be logged:

```typescript
interface McpAuditEntry {
  timestamp: string;
  serverId: string;
  serverName: string;
  tool: string;
  params: Record<string, unknown>; // Sanitized
  result: "success" | "error" | "denied";
  error?: string;
  workspaceId: string;
  userId: string;
}
```

- Log to SQLite (local-first).
- Include timestamp, server ID, tool name, parameters (sanitized), result, and workspace context.
- Provide UI for users to view and filter audit logs.

### 9.5 Sandbox Boundary

MCP servers must run within a defined sandbox:
- **Network:** Only outbound connections to explicitly allowed hosts.
- **Filesystem:** Only workspace directory, no access outside it.
- **Process:** No ability to spawn child processes (unless explicitly granted).
- **IPC:** MCP server cannot call back into the main process except through the registered MCP protocol.

---

## 10. Input Validation Requirements

### 10.1 Principle

All inputs from the renderer to the main process must be validated. No input may be trusted.

### 10.2 Validation Layers

| Layer | Tool | Scope |
|-------|------|-------|
| IPC schema | Zod | All IPC invoke/send inputs |
| Business logic | Zod + custom | Domain rules (e.g., task status transitions) |
| Renderer | Zod + DOM sanitization | User input before sending to main |

### 10.3 Required Schemas

- All file paths: must be absolute, must resolve inside workspace directory, no `..` traversal.
- All text inputs: sanitized for XSS (escape HTML entities in markdown rendering).
- All JSON configs: validated against a Zod schema before parsing.
- All provider configs: API key format validated, endpoint URL validated.

### 10.4 Sanitization

- **Markdown:** Use a sanitizing renderer (DOMPurify or equivalent). Never inject raw HTML from user input.
- **Code blocks:** Render as text, never as executable HTML.
- **File names:** Strip path separators, null bytes, and control characters.

---

## 11. Network Isolation Options

### 11.1 Default Behavior

- All outbound connections must use `https:` unless explicitly allowed otherwise.
- No connection to private IP ranges by default (SSRF prevention).
- All provider API calls must go through a typed provider adapter, never raw `fetch`.

### 11.2 Offline Mode

- The app must function without network connectivity for local operations (workspace browsing, local agents, file management).
- Graceful degradation: show offline indicator, queue network requests for retry.

### 11.3 Proxy Support

- If a proxy is configured, all outbound traffic routes through it.
- Proxy credentials stored in `safeStorage`.
- Validate proxy URL before applying.

---

## 12. Electron Security Testing

### 12.1 Automated Checks

Add to CI pipeline:

1. **Context isolation test:** Assert all windows use `contextIsolation: true`.
2. **Preload audit test:** Scan preload exports for prohibited modules (`fs`, `path`, etc.).
3. **IPC schema coverage test:** Every registered handler must have a corresponding Zod schema.
4. **CSP test:** Verify CSP header is present and contains no `unsafe-inline` or `unsafe-eval`.
5. **Safe storage test:** Verify API keys are encrypted in the database.

### 12.2 Manual Penetration Testing

Before each release:
1. Attempt RCE via XSS in chat input.
2. Attempt path traversal in file operations.
3. Attempt SSRF in URL handling.
4. Attempt IPC message forgery from a mock renderer.
5. Attempt MCP server privilege escalation.

---

## 13. Incident Response

### 13.1 Vulnerability Disclosure

- Security.md must contain a vulnerability disclosure policy.
- Security contact email must be monitored.
- Response SLA: 72 hours for initial response, 30 days for fix.

### 13.2 Supply Chain

- Run `pnpm audit` in CI.
- Use `license-checker` to block AGPL/GPL/LGPL/SSPL/BUSL dependencies.
- Pin all dependencies with exact versions (no `^` or `~` in production lockfile).

### 13.3 Runtime Hardening

- Enable Electron's `--disable-features=OutOfBlinkCors` if CORS enforcement causes issues (document why).
- Enable `--enable-logging` only in development.
- Strip source maps from production builds.

---

## 14. Quality Gate Checklist

Before any release, verify:

- [ ] `contextIsolation: true` on all windows
- [ ] `nodeIntegration: false` on all windows
- [ ] Preload exports audited and whitelisted
- [ ] All IPC channels in central registry
- [ ] All IPC handlers have Zod schemas
- [ ] Sender validation on all IPC handlers
- [ ] URLValidator used for all external URL opens
- [ ] SSRF protection enabled
- [ ] CSP configured with nonce, no unsafe-inline/eval
- [ ] API keys stored via safeStorage (encrypted values)
- [ ] MCP trust model implemented with user approval
- [ ] Audit logging active for MCP and sensitive operations
- [ ] ESLint restricted imports enforced in renderer
- [ ] CI security tests passing
- [ ] Supply chain audit clean (no AGPL in production)
