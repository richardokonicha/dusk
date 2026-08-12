import { ipcMain } from "electron";
import { Container } from "../../core/container";
import { registerFileHandlers } from "./file";
import { registerSettingsHandlers } from "./settings";
import { registerAgentHandlers } from "./agent";
import { registerOnboardingHandlers } from "./onboarding";
import { registerCoreHandlers } from "./core";
import { registerProviderHandlers } from "./provider";
import { registerJobHandlers } from "./job";

export function registerIpcHandlers(container: Container, ipc: typeof ipcMain): void {
  registerCoreHandlers(container);
  registerFileHandlers(container);
  registerSettingsHandlers();
  registerAgentHandlers(container);
  registerOnboardingHandlers();
  registerProviderHandlers(container);
  registerJobHandlers(container);
}
