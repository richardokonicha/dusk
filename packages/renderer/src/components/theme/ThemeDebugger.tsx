import { useThemeContext } from "../theme-provider";

export function ThemeDebugger() {
  const { theme, resolvedTheme, tokens, highContrast, reducedMotion, isDark, isSystem } =
    useThemeContext();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-elevated p-4 shadow-lg text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-fg">Theme Debugger</h3>
        <span className="rounded bg-accent px-2 py-0.5 text-accent-foreground">
          {resolvedTheme}
        </span>
      </div>
      <div className="space-y-1 text-fg-secondary">
        <div>theme: <span className="text-fg">{theme}</span></div>
        <div>resolved: <span className="text-fg">{resolvedTheme}</span></div>
        <div>isDark: <span className="text-fg">{String(isDark)}</span></div>
        <div>isSystem: <span className="text-fg">{String(isSystem)}</span></div>
        <div>highContrast: <span className="text-fg">{String(highContrast)}</span></div>
        <div>reducedMotion: <span className="text-fg">{String(reducedMotion)}</span></div>
      </div>
      <div className="mt-3 border-t border-border pt-2">
        <div className="text-fg-muted mb-1">Tokens</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-fg-secondary">
          <div>bg: <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ backgroundColor: tokens.bg }} /></div>
          <div>fg: <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ backgroundColor: tokens.fg }} /></div>
          <div>accent: <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ backgroundColor: tokens.accent }} /></div>
          <div>border: <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ backgroundColor: tokens.border }} /></div>
        </div>
      </div>
    </div>
  );
}
