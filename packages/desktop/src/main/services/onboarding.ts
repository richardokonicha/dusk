import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Provider, Agent, OnboardingState, Settings, ThemeSettings, GeneralSettings } from "../../../../shared/dist/src/types.js";

const DATA_DIR = path.join(os.homedir(), ".dusk");
const ONBOARDING_FILE = path.join(DATA_DIR, "onboarding.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function writeJson<T>(file: string, data: T): void {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export class OnboardingService {
  static getState(): OnboardingState {
    return readJson<OnboardingState>(ONBOARDING_FILE, {
      completed: false,
      skipped: false,
      currentStep: "welcome",
      startedAt: new Date().toISOString(),
      completedAt: null
    });
  }

  static updateState(partial: Partial<OnboardingState>): OnboardingState {
    const current = this.getState();
    const updated = { ...current, ...partial };
    writeJson(ONBOARDING_FILE, updated);
    return updated;
  }

  static complete(): OnboardingState {
    return this.updateState({
      completed: true,
      completedAt: new Date().toISOString(),
      currentStep: "complete"
    });
  }

  static skip(): OnboardingState {
    return this.updateState({
      skipped: true,
      completed: true,
      completedAt: new Date().toISOString(),
      currentStep: "complete"
    });
  }

  static setStep(step: OnboardingState["currentStep"]): OnboardingState {
    return this.updateState({ currentStep: step });
  }

  static isFirstRun(): boolean {
    const state = this.getState();
    return !state.completed && !state.skipped;
  }

  static reset(): void {
    writeJson(ONBOARDING_FILE, {
      completed: false,
      skipped: false,
      currentStep: "welcome",
      startedAt: new Date().toISOString(),
      completedAt: null
    });
  }
}

export class SettingsService {
  static getSettings(): Settings {
    const defaults: Settings = {
      theme: {
        mode: "dark",
        accentColor: "#22c55e",
        fontSize: "medium",
        reducedMotion: false
      },
      general: {
        autoLaunch: false,
        minimizeToTray: true,
        notificationsEnabled: true,
        telemetryEnabled: false
      },
      onboarding: OnboardingService.getState()
    };
    return readJson<Settings>(SETTINGS_FILE, defaults);
  }

  static updateSettings(partial: Partial<Settings>): Settings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    if (partial.theme) {
      updated.theme = { ...current.theme, ...partial.theme };
    }
    if (partial.general) {
      updated.general = { ...current.general, ...partial.general };
    }
    if (partial.onboarding) {
      updated.onboarding = { ...current.onboarding, ...partial.onboarding };
    }
    writeJson(SETTINGS_FILE, updated);
    return updated;
  }

  static updateTheme(theme: Partial<ThemeSettings>): ThemeSettings {
    const current = this.getSettings();
    const updated = { ...current.theme, ...theme };
    this.updateSettings({ theme: updated });
    return updated;
  }

  static updateGeneral(general: Partial<GeneralSettings>): GeneralSettings {
    const current = this.getSettings();
    const updated = { ...current.general, ...general };
    this.updateSettings({ general: updated });
    return updated;
  }
}

export class ProviderService {
  static list(): Provider[] {
    return readJson<Provider[]>(PROVIDERS_FILE, []);
  }

  static getById(id: string): Provider | undefined {
    return this.list().find((p) => p.id === id);
  }

  static create(provider: Omit<Provider, "id" | "createdAt" | "updatedAt">): Provider {
    const providers = this.list();
    const newProvider: Provider = {
      ...provider,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    providers.push(newProvider);
    writeJson(PROVIDERS_FILE, providers);
    return newProvider;
  }

  static update(id: string, partial: Partial<Provider>): Provider | undefined {
    const providers = this.list();
    const index = providers.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    providers[index] = { ...providers[index], ...partial, updatedAt: new Date().toISOString() };
    writeJson(PROVIDERS_FILE, providers);
    return providers[index];
  }

  static delete(id: string): boolean {
    const providers = this.list();
    const filtered = providers.filter((p) => p.id !== id);
    if (filtered.length === providers.length) return false;
    writeJson(PROVIDERS_FILE, filtered);
    return true;
  }
}

export class AgentService {
  static list(): Agent[] {
    return readJson<Agent[]>(AGENTS_FILE, []);
  }

  static getById(id: string): Agent | undefined {
    return this.list().find((a) => a.id === id);
  }

  static create(agent: Omit<Agent, "id" | "createdAt" | "updatedAt">): Agent {
    const agents = this.list();
    const newAgent: Agent = {
      ...agent,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    agents.push(newAgent);
    writeJson(AGENTS_FILE, agents);
    return newAgent;
  }

  static update(id: string, partial: Partial<Agent>): Agent | undefined {
    const agents = this.list();
    const index = agents.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    agents[index] = { ...agents[index], ...partial, updatedAt: new Date().toISOString() };
    writeJson(AGENTS_FILE, agents);
    return agents[index];
  }

  static delete(id: string): boolean {
    const agents = this.list();
    const filtered = agents.filter((a) => a.id !== id);
    if (filtered.length === agents.length) return false;
    writeJson(AGENTS_FILE, filtered);
    return true;
  }
}
