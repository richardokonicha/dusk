import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  session,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { Container, type SecurityServices } from "./core/container";
import { CspManager, createCspManager, URLValidator, createDefaultUrlValidator } from "./security";
import { validateSender, sanitizeString, sanitizeAuditParams } from "./security";
import { registerIpcHandlers } from "./ipc/handlers";

let mainWindow: BrowserWindow | null = null;
let container: Container | null = null;

const isDev = process.env.NODE_ENV !== "production";
const SHUTDOWN_TIMEOUT_MS = 5000;

const WHITELISTED_IPC_CHANNELS = new Set([
  "workspace:list",
  "workspace:create",
  "workspace:get",
  "workspace:update",
  "workspace:delete",
  "workspace:export",
  "workspace:import",
  "conversation:list",
  "conversation:create",
  "conversation:get",
  "conversation:delete",
  "message:send",
  "message:history",
  "message:stream",
  "agent:list",
  "agent:create",
  "agent:get",
  "agent:update",
  "agent:delete",
  "agent:invoke",
  "agent:stop",
  "agent:switch",
  "agent:statuses",
  "agent:active",
  "file:list",
  "file:read",
  "file:write",
  "file:delete",
  "file:create-dir",
  "file:watch",
  "artifact:list",
  "artifact:get",
  "artifact:save",
  "artifact:delete",
  "artifact:link",
  "provider:list",
  "provider:add",
  "provider:test",
  "provider:get-models",
  "provider:testConnection",
  "settings:get",
  "settings:set",
  "onboarding:status",
  "onboarding:complete",
  "onboarding:skip",
  "onboarding:setStep",
  "onboarding:isFirstRun",
  "onboarding:reset",
  "job:list",
  "job:get",
  "job:cancel",
  "job:retry",
  "system:info",
  "system:open-path",
  "system:open-external",
]);

function initializeSecurityContext(): SecurityServices {
  const csp = createCspManager({
    nonceLength: 32,
    allowedScriptSrc: isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    allowedStyleSrc: isDev
      ? ["'self'", "'unsafe-inline'"]
      : ["'self'", "'nonce-{CSP_NONCE}'"],
    allowedImgSrc: ["'self'", "data:", "https:"],
    allowedFontSrc: ["'self'", "data:"],
    allowedConnectSrc: ["'self'", "https:"],
    allowedFrameSrc: ["'none'"],
  });

  const urlValidator = createDefaultUrlValidator();

  return { csp, urlValidator };
}

function setupSessionSecurity(): void {
  const defaultSession = session.defaultSession;

  defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders: Record<string, string> = { ...details.requestHeaders };
    requestHeaders["X-Content-Type-Options"] = "nosniff";
    requestHeaders["X-Frame-Options"] = "DENY";
    requestHeaders["X-XSS-Protection"] = "1; mode=block";
    callback({ requestHeaders });
  });

  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders: Record<string, string | string[]> = { ...details.responseHeaders };

    if (container && !responseHeaders["Content-Security-Policy"]) {
      const policy = container.security.csp.buildPolicy();
      if (policy) {
        responseHeaders["Content-Security-Policy"] = policy;
      }
    }

    if (!responseHeaders["X-Content-Type-Options"]) {
      responseHeaders["X-Content-Type-Options"] = "nosniff";
    }
    if (!responseHeaders["X-Frame-Options"]) {
      responseHeaders["X-Frame-Options"] = "DENY";
    }

    callback({ responseHeaders });
  });

  if (!isDev) {
    defaultSession.clearStorageData({
      storages: ["cookies", "localstorage", "indexdb", "serviceworkers"],
    });
  }
}

function setupGlobalSecurityHandlers(): void {
  app.on("web-contents-created", (event, contents) => {
    contents.on("will-attach-webview", (event, webPreferences) => {
      event.preventDefault();
      console.warn("Blocked webview attachment attempt");
    });

    contents.on("will-navigate", (event, navigationUrl) => {
      if (!container) return;
      const result = container.security.urlValidator.validate(navigationUrl);
      if (!result.valid) {
        event.preventDefault();
        console.warn(`Blocked navigation to ${navigationUrl}: ${result.reason}`);
      }
    });
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    logSecurityEvent("uncaught_exception", { message: error.message, stack: error.stack });
    gracefulShutdown();
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    logSecurityEvent("unhandled_rejection", { reason: String(reason) });
  });

  app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    logSecurityEvent("certificate_error", { url, error: String(error) });
    callback(false);
  });
}

function logSecurityEvent(event: string, metadata: Record<string, unknown>): void {
  const sanitized = sanitizeAuditParams(metadata);
  console.log(`[SECURITY] ${event}`, JSON.stringify(sanitized));
}

function createSecureIpcHandler<T = unknown>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, args: unknown) => Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }>
): (event: Electron.IpcMainInvokeEvent, args: unknown) => Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> {
  return async (event, args): Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> => {
    if (!validateSender(event)) {
      logSecurityEvent("unauthorized_sender", { channel });
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }

    if (!WHITELISTED_IPC_CHANNELS.has(channel)) {
      logSecurityEvent("unknown_channel", { channel });
      return { success: false, error: { code: "UNKNOWN_CHANNEL", message: "Channel not registered" } };
    }

    try {
      return await handler(event, args);
    } catch (error) {
      console.error(`IPC handler error [${channel}]:`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      logSecurityEvent("ipc_handler_error", { channel, error: err.message });
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", message: err.message },
      };
    }
  };
}

function registerSecurityIpcHandlers(): void {
  ipcMain.handle(
    "system:open-external",
    createSecureIpcHandler("system:open-external", async (event, args) => {
      const rawUrl = typeof args === "string" ? args : String(args ?? "");
      const sanitizedUrl = sanitizeString(rawUrl, 2048);

      if (!container) {
        return { success: false, error: { code: "SECURITY_NOT_INITIALIZED", message: "Security context unavailable" } };
      }

      const result = container.security.urlValidator.validate(sanitizedUrl);
      if (!result.valid) {
        return { success: false, error: { code: "INVALID_URL", message: result.reason ?? "Invalid URL" } };
      }

      try {
        await shell.openExternal(result.sanitized ?? sanitizedUrl);
        logSecurityEvent("open_external", { url: result.sanitized });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: { code: "OPEN_EXTERNAL_ERROR", message: (error as Error).message },
        };
      }
    })
  );
}

function createWindow(): void {
  if (!container) {
    throw new Error("Container must be initialized before creating window");
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "../preload/index.js"),
      webviewTag: false,
      devTools: isDev,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!container) {
      console.warn("Security context unavailable, denying window open");
      return { action: "deny" };
    }
    const result = container.security.urlValidator.validate(url);
    if (!result.valid) {
      console.warn(`Blocked window open to ${url}: ${result.reason}`);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("did-navigate", (event, url) => {
    if (!container) return;
    const result = container.security.urlValidator.validate(url);
    if (!result.valid) {
      event.preventDefault();
      console.warn(`Blocked post-navigation to ${url}: ${result.reason}`);
      mainWindow?.loadURL(isDev ? "http://localhost:5173" : path.join(__dirname, "../renderer/index.html"));
    }
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error(`Failed to load renderer: ${errorCode} - ${errorDescription}`);
    if (isDev && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL("http://localhost:5173").catch(() => {
        console.error("Dev server unreachable");
      });
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173").catch((error) => {
      console.error("Failed to load dev URL:", error);
    });
    mainWindow.webContents.openDevTools();
  } else {
    loadRendererHtml().then((html) => {
      mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });
  }

  container.security.csp.setCspHeader(mainWindow);
}

async function loadRendererHtml(): Promise<string> {
  const htmlPath = path.join(__dirname, "../renderer/index.html");
  let html = await fs.readFile(htmlPath, "utf-8");
  if (container) {
    html = container.security.csp.injectNonceIntoHtml(html);
  }
  return html;
}

async function gracefulShutdown(): Promise<void> {
  if (container) {
    try {
      const shutdownPromise = container.shutdown();
      const timeoutPromise = new Promise<void>((resolve) =>
        setTimeout(() => resolve(), SHUTDOWN_TIMEOUT_MS)
      );
      await Promise.race([shutdownPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error during container shutdown:", error);
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }

  app.exit(0);
}

async function bootstrap(): Promise<void> {
  try {
    const securityContext = initializeSecurityContext();

    app.enableSandbox();

    app.on("ready", () => {
      setupSessionSecurity();
    });

    container = await Container.create({ security: securityContext });
    await container.initialize();

    app.whenReady().then(() => {
      setupGlobalSecurityHandlers();
      registerSecurityIpcHandlers();
      createWindow();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        gracefulShutdown();
      }
    });

    app.on("before-quit", async (event) => {
      event.preventDefault();
      await gracefulShutdown();
    });

    app.on("quit", async () => {
      await gracefulShutdown();
    });

    registerIpcHandlers(container, ipcMain);
  } catch (error) {
    console.error("Failed to bootstrap Dusk:", error);
    logSecurityEvent("bootstrap_failure", { error: (error as Error).message });
    await gracefulShutdown();
  }
}

bootstrap();
