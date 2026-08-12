import { useState, useEffect, useCallback, useMemo } from "react";

export type Theme = "light" | "dark" | "high-contrast" | "system";

export interface ThemeTokenValues {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  bgHover: string;
  bgActive: string;
  fg: string;
  fgSecondary: string;
  fgMuted: string;
  fgOnAccent: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  border: string;
  borderMuted: string;
  ring: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  error: string;
  errorForeground: string;
  info: string;
  infoForeground: string;
  disabled: string;
  disabledBg: string;
  readonly: string;
  readonlyBorder: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easingDefault: string;
}

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

const TOKEN_MAP: Record<string, keyof ThemeTokenValues> = {
  "--bg": "bg",
  "--bg-secondary": "bgSecondary",
  "--bg-tertiary": "bgTertiary",
  "--bg-elevated": "bgElevated",
  "--bg-hover": "bgHover",
  "--bg-active": "bgActive",
  "--fg": "fg",
  "--fg-secondary": "fgSecondary",
  "--fg-muted": "fgMuted",
  "--fg-on-accent": "fgOnAccent",
  "--accent": "accent",
  "--accent-hover": "accentHover",
  "--accent-muted": "accentMuted",
  "--border": "border",
  "--border-muted": "borderMuted",
  "--ring": "ring",
  "--success": "success",
  "--success-foreground": "successForeground",
  "--warning": "warning",
  "--warning-foreground": "warningForeground",
  "--error": "error",
  "--error-foreground": "errorForeground",
  "--info": "info",
  "--info-foreground": "infoForeground",
  "--disabled": "disabled",
  "--disabled-bg": "disabledBg",
  "--readonly": "readonly",
  "--readonly-border": "readonlyBorder",
  "--shadow-sm": "shadowSm",
  "--shadow-md": "shadowMd",
  "--shadow-lg": "shadowLg",
  "--duration-fast": "durationFast",
  "--duration-normal": "durationNormal",
  "--duration-slow": "durationSlow",
  "--easing-default": "easingDefault",
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("dusk-theme") as Theme) || "system";
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | "high-contrast">(() => {
    if (typeof window !== "undefined") {
      return getSystemTheme();
    }
    return "light";
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-contrast: more)").matches;
    }
    return false;
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  const tokens = useMemo<ThemeTokenValues>(() => {
    if (resolvedTheme === "dark") return DARK_TOKENS;
    if (resolvedTheme === "high-contrast") return HIGH_CONTRAST_TOKENS;
    return LIGHT_TOKENS;
  }, [resolvedTheme]);

  const applyThemeToDOM = useCallback((newResolved: "light" | "dark" | "high-contrast") => {
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    if (newResolved !== "light") {
      root.setAttribute("data-theme", newResolved);
    }
    root.style.colorScheme = newResolved === "high-contrast" ? "light" : newResolved;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme, applyThemeToDOM]);

  useEffect(() => {
    if (theme !== "system") return;

    const colorSchemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastMedia = window.matchMedia("(prefers-contrast: more)");

    const updateFromMedia = () => {
      const isDark = colorSchemeMedia.matches;
      const isHighContrast = contrastMedia.matches;
      const newResolved: "light" | "dark" | "high-contrast" = isHighContrast
        ? "high-contrast"
        : isDark
          ? "dark"
          : "light";
      setResolvedTheme(newResolved);
    };

    updateFromMedia();

    const colorHandler = (e: MediaQueryListEvent) => {
      const isHighContrast = contrastMedia.matches;
      const newResolved: "light" | "dark" | "high-contrast" = isHighContrast
        ? "high-contrast"
        : e.matches
          ? "dark"
          : "light";
      setResolvedTheme(newResolved);
    };

    const contrastHandler = () => {
      const isDark = colorSchemeMedia.matches;
      const isHighContrast = contrastMedia.matches;
      const newResolved: "light" | "dark" | "high-contrast" = isHighContrast
        ? "high-contrast"
        : isDark
          ? "dark"
          : "light";
      setResolvedTheme(newResolved);
    };

    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionHandler = () => setReducedMotion(reducedMotionMedia.matches);

    colorSchemeMedia.addEventListener("change", colorHandler);
    contrastMedia.addEventListener("change", contrastHandler);
    reducedMotionMedia.addEventListener("change", motionHandler);

    return () => {
      colorSchemeMedia.removeEventListener("change", colorHandler);
      contrastMedia.removeEventListener("change", contrastHandler);
      reducedMotionMedia.removeEventListener("change", motionHandler);
    };
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("dusk-theme", newTheme);
    }
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    tokens,
    highContrast,
    reducedMotion,
  };
}

export function getSystemTheme(): "light" | "dark" | "high-contrast" {
  if (typeof window === "undefined") return "light";

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const prefersHighContrast = window.matchMedia("(prefers-contrast: more)").matches;

  if (prefersHighContrast) return "high-contrast";
  return prefersDark ? "dark" : "light";
}

export function getTokenValue(tokenName: string, resolved: "light" | "dark" | "high-contrast"): string | undefined {
  let source: ThemeTokenValues;
  if (resolved === "dark") source = DARK_TOKENS;
  else if (resolved === "high-contrast") source = HIGH_CONTRAST_TOKENS;
  else source = LIGHT_TOKENS;

  const key = TOKEN_MAP[tokenName];
  return key ? source[key] : undefined;
}
