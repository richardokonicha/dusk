import { app, BrowserWindow, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";

export class AutoUpdateService {
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.configureUpdater();
    this.setupEventListeners();
  }

  private configureUpdater(): void {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    if (process.env.NODE_ENV === "development") {
      (autoUpdater as any).updateURL = "http://localhost:5500";
    }
  }

  private setupEventListeners(): void {
    autoUpdater.on("checking-for-update", () => {
      this.sendToRenderer("update-checking");
    });

    autoUpdater.on("update-available", (info) => {
      this.sendToRenderer("update-available", {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });

      const choice = dialog.showMessageBoxSync(this.mainWindow!, {
        type: "info",
        title: "Update Available",
        message: `A new version (${info.version}) is available.`,
        detail: "Would you like to download and install it now?",
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
      });

      if (choice === 0) {
        autoUpdater.downloadUpdate();
      }
    });

    autoUpdater.on("update-not-available", () => {
      this.sendToRenderer("update-not-available");
    });

    autoUpdater.on("download-progress", (progress) => {
      this.sendToRenderer("update-download-progress", {
        percent: Math.floor(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      this.sendToRenderer("update-downloaded", {
        version: info.version,
      });

      const choice = dialog.showMessageBoxSync(this.mainWindow!, {
        type: "info",
        title: "Update Ready",
        message: `Version ${info.version} has been downloaded.`,
        detail: "Restart the app to apply the update?",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      });

      if (choice === 0) {
        autoUpdater.quitAndInstall();
      }
    });

    autoUpdater.on("error", (error) => {
      console.error("Auto-update error:", error);
      this.sendToRenderer("update-error", { message: error.message });
    });
  }

  private sendToRenderer(channel: string, data?: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("auto-update", { channel, data });
    }
  }

  public checkForUpdates(): void {
    autoUpdater.checkForUpdates();
  }

  public downloadUpdate(): void {
    autoUpdater.downloadUpdate();
  }

  public quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }
}
