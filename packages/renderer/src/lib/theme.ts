import type { ThemeTokenValues } from "../hooks/use-theme";

const LIGHT_TOKENS: ThemeTokenValues = {
  bg: "#fafaf9",
  bgSecondary: "#f5f5f4",
  bgTertiary: "#e7e5e4",
  bgElevated: "#ffffff",
  bgHover: "#f0efef",
  bgActive: "#e7e5e4",
  fg: "#1c1917",
  fgSecondary: "#57534e",
  fgMuted: "#a8a29e",
  fgOnAccent: "#ffffff",
  accent: "#8b5cf6",
  accentHover: "#7c3aed",
  accentMuted: "#ddd6fe",
  border: "#e7e5e4",
  borderMuted: "#f5f5f4",
  ring: "#8b5cf6",
  success: "#22c55e",
  successForeground: "#ffffff",
  warning: "#f59e0b",
  warningForeground: "#1c1917",
  error: "#ef4444",
  errorForeground: "#ffffff",
  info: "#3b82f6",
  infoForeground: "#ffffff",
  disabled: "#a8a29e",
  disabledBg: "#f5f5f4",
  readonly: "#f5f5f4",
  readonlyBorder: "#e7e5e4",
  shadowSm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  shadowMd: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  shadowLg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  durationFast: "150ms",
  durationNormal: "250ms",
  durationSlow: "350ms",
  easingDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
};

const DARK_TOKENS: ThemeTokenValues = {
  bg: "#0c0a09",
  bgSecondary: "#1c1917",
  bgTertiary: "#292524",
  bgElevated: "#1c1917",
  bgHover: "#292524",
  bgActive: "#44403c",
  fg: "#fafaf9",
  fgSecondary: "#a8a29e",
  fgMuted: "#78716c",
  fgOnAccent: "#ffffff",
  accent: "#a78bfa",
  accentHover: "#8b5cf6",
  accentMuted: "#4c1d95",
  border: "#292524",
  borderMuted: "#1c1917",
  ring: "#a78bfa",
  success: "#4ade80",
  successForeground: "#1c1917",
  warning: "#fbbf24",
  warningForeground: "#1c1917",
  error: "#f87171",
  errorForeground: "#1c1917",
  info: "#60a5fa",
  infoForeground: "#1c1917",
  disabled: "#78716c",
  disabledBg: "#292524",
  readonly: "#292524",
  readonlyBorder: "#44403c",
  shadowSm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
  shadowMd: "0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
  shadowLg: "0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)",
  durationFast: "150ms",
  durationNormal: "250ms",
  durationSlow: "350ms",
  easingDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
};

const HIGH_CONTRAST_TOKENS: ThemeTokenValues = {
  bg: "#ffffff",
  bgSecondary: "#f0f0f0",
  bgTertiary: "#e0e0e0",
  bgElevated: "#ffffff",
  bgHover: "#e0e0e0",
  bgActive: "#d0d0d0",
  fg: "#000000",
  fgSecondary: "#1a1a1a",
  fgMuted: "#4d4d4d",
  fgOnAccent: "#ffffff",
  accent: "#0000ff",
  accentHover: "#0000cc",
  accentMuted: "#ccccff",
  border: "#000000",
  borderMuted: "#808080",
  ring: "#0000ff",
  success: "#008000",
  successForeground: "#ffffff",
  warning: "#b35900",
  warningForeground: "#ffffff",
  error: "#cc0000",
  errorForeground: "#ffffff",
  info: "#0055cc",
  infoForeground: "#ffffff",
  disabled: "#808080",
  disabledBg: "#f0f0f0",
  readonly: "#f0f0f0",
  readonlyBorder: "#808080",
  shadowSm: "none",
  shadowMd: "none",
  shadowLg: "none",
  durationFast: "150ms",
  durationNormal: "250ms",
  durationSlow: "350ms",
  easingDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export function getSystemTheme(): "light" | "dark" | "high-contrast" {
  if (typeof window === "undefined") return "light";

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const prefersHighContrast = window.matchMedia("(prefers-contrast: more)").matches;

  if (prefersHighContrast) return "high-contrast";
  return prefersDark ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark" | "high-contrast"): void {
  const root = document.documentElement;
  root.removeAttribute("data-theme");

  if (theme !== "light") {
    root.setAttribute("data-theme", theme);
  }

  root.style.colorScheme = theme === "high-contrast" ? "light" : theme;
}

export function generateThemeCSS(theme: "light" | "dark" | "high-contrast"): string {
  let tokens: ThemeTokenValues;
  if (theme === "dark") tokens = DARK_TOKENS;
  else if (theme === "high-contrast") tokens = HIGH_CONTRAST_TOKENS;
  else tokens = LIGHT_TOKENS;

  const lines: string[] = [];
  for (const [key, value] of Object.entries(tokens)) {
    const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    lines.push(`  ${cssVar}: ${value};`);
  }

  const selector = theme === "light" ? ":root" : `[data-theme="${theme}"]`;
  return `${selector} {\n${lines.join("\n")}\n}`;
}

export function validateTheme(theme: unknown): theme is "light" | "dark" | "high-contrast" {
  return theme === "light" || theme === "dark" || theme === "high-contrast";
}

export function getTokensForTheme(theme: "light" | "dark" | "high-contrast"): ThemeTokenValues {
  if (theme === "dark") return DARK_TOKENS;
  if (theme === "high-contrast") return HIGH_CONTRAST_TOKENS;
  return LIGHT_TOKENS;
}
