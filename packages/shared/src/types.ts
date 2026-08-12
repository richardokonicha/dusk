export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  blocks: { id: string; messageId: string; type: string; content: string }[];
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  providerId: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export type ProviderType = "openai" | "anthropic" | "ollama" | "azure" | "custom";

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey: string;
  baseUrl: string;
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export type OnboardingStep = "welcome" | "provider" | "workspace" | "complete";

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  currentStep: OnboardingStep;
  startedAt: string;
  completedAt: string | null;
}

export type ThemeMode = "dark" | "light" | "system";

export interface ThemeSettings {
  mode: ThemeMode;
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  reducedMotion: boolean;
}

export interface GeneralSettings {
  autoLaunch: boolean;
  minimizeToTray: boolean;
  notificationsEnabled: boolean;
  telemetryEnabled: boolean;
}

export interface Settings {
  theme: ThemeSettings;
  general: GeneralSettings;
  onboarding: OnboardingState;
}

export type SettingsTab = "providers" | "agents" | "theme" | "general";
