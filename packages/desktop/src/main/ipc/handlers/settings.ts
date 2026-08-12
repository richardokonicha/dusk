import { ipcMain } from "electron";
import { SettingsService } from "../../services/onboarding";
import { validateSender } from "../../security/sender-validator";
import { channels } from "../channels";

export function registerSettingsHandlers(): void {
  ipcMain.handle(channels.settings.get, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    return SettingsService.getSettings();
  });

  ipcMain.handle(channels.settings.set, async (event, partial: object) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    return SettingsService.updateSettings(partial as Parameters<typeof SettingsService.updateSettings>[0]);
  });
}
