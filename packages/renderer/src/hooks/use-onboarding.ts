import { useState, useEffect, useCallback } from "react";
import type { OnboardingState, OnboardingStep, Provider, Workspace } from "@shared/types";

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingState | null>(null);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const [state, firstRun] = await Promise.all([
        window.dusk.ipc.invoke<OnboardingState>("onboarding:status"),
        window.dusk.ipc.invoke<boolean>("onboarding:isFirstRun")
      ]);
      setStatus(state);
      setIsFirstRun(firstRun);
    } catch (error) {
      console.error("Failed to load onboarding status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const complete = useCallback(async () => {
    const result = await window.dusk.onboarding.complete();
    const state = result.data as OnboardingState;
    setStatus(state);
    setIsFirstRun(false);
    return state;
  }, []);

  const skip = useCallback(async () => {
    const result = await window.dusk.onboarding.skip();
    const state = result.data as OnboardingState;
    setStatus(state);
    setIsFirstRun(false);
    return state;
  }, []);

  const setStep = useCallback(async (step: OnboardingStep) => {
    const result = await window.dusk.onboarding.setStep(step);
    const state = result.data as OnboardingState;
    setStatus(state);
    return state;
  }, []);

  const testProviderConnection = useCallback(async (provider: { type: string; baseUrl: string; apiKey: string }) => {
    return window.dusk.onboarding.testProviderConnection(provider);
  }, []);

  const reset = useCallback(async () => {
    const result = await window.dusk.onboarding.reset();
    const state = result.data as OnboardingState;
    setStatus(state);
    setIsFirstRun(true);
    return state;
  }, []);

  return {
    status,
    isFirstRun,
    loading,
    complete,
    skip,
    setStep,
    testProviderConnection,
    reset,
    refresh: loadStatus
  };
}
