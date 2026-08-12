import React, { useEffect, useMemo } from "react";
import { useTheme, type Theme, type ThemeTokenValues } from "../hooks/use-theme";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "dusk-theme",
}: ThemeProviderProps) {
  const { theme, resolvedTheme, setTheme, tokens, highContrast, reducedMotion } = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const contextValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      tokens,
      highContrast,
      reducedMotion,
      isDark: resolvedTheme === "dark" || resolvedTheme === "high-contrast",
      isSystem: theme === "system",
    }),
    [theme, resolvedTheme, setTheme, tokens, highContrast, reducedMotion]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark" | "high-contrast";
  setTheme: (theme: Theme) => void;
  tokens: ThemeTokenValues;
  highContrast: boolean;
  reducedMotion: boolean;
  isDark: boolean;
  isSystem: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function useThemeContext() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
