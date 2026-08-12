import { ipcMain } from "electron";
import { OnboardingService, ProviderService } from "../../services/onboarding";
import { validateSender } from "../../security/sender-validator";
import { channels } from "../channels";
import {
  onboardingStatusSchema,
  onboardingCompleteSchema,
  onboardingSkipSchema,
  onboardingSetStepSchema,
  onboardingIsFirstRunSchema,
  onboardingResetSchema,
  providerTestConnectionSchema,
} from "../validator";

export function registerOnboardingHandlers(): void {
  ipcMain.handle(channels.onboarding.status, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    onboardingStatusSchema.parse({});
    return OnboardingService.getState();
  });

  ipcMain.handle(channels.onboarding.complete, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    onboardingCompleteSchema.parse({});
    return OnboardingService.complete();
  });

  ipcMain.handle(channels.onboarding.skip, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    onboardingSkipSchema.parse({});
    return OnboardingService.skip();
  });

  ipcMain.handle(channels.onboarding.setStep, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const { step } = onboardingSetStepSchema.parse(args);
    return OnboardingService.setStep(step);
  });

  ipcMain.handle(channels.onboarding.isFirstRun, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    onboardingIsFirstRunSchema.parse({});
    return OnboardingService.isFirstRun();
  });

  ipcMain.handle(channels.onboarding.reset, async (event) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    onboardingResetSchema.parse({});
    OnboardingService.reset();
    return OnboardingService.getState();
  });

  ipcMain.handle(channels.onboarding.testConnection, async (event, args) => {
    if (!validateSender(event)) {
      return { success: false, error: { code: "UNAUTHORIZED_SENDER", message: "Invalid sender" } };
    }
    const validated = providerTestConnectionSchema.parse(args);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let url = validated.baseUrl.replace(/\/$/, "");
      if (!url.endsWith("/v1")) {
        url = `${url}/v1`;
      }

      const response = await fetch(`${url}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${validated.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((m: { id: string }) => m.id) ?? [];
        return { success: true, models };
      }

      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });
}
