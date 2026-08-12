import { motion } from "framer-motion";

interface ThemePreviewProps {
  mode: "light" | "dark" | "system";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
}

const fontSizeMap = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base"
};

export function ThemePreview({ mode, accentColor, fontSize }: ThemePreviewProps) {
  const bgColor = mode === "dark" ? "#0f1115" : "#fafafa";
  const cardColor = mode === "dark" ? "#1a1d24" : "#ffffff";
  const textColor = mode === "dark" ? "#e5e7eb" : "#18181b";
  const mutedColor = mode === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Preview</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {mode}
        </span>
      </div>

      <div
        className="rounded-lg border border-border p-4"
        style={{ backgroundColor: cardColor }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className={`font-medium ${fontSizeMap[fontSize]}`}
            style={{ color: textColor }}
          >
            Task title
          </span>
        </div>
        <p
          className={`mb-4 leading-relaxed ${fontSizeMap[fontSize]}`}
          style={{ color: mutedColor }}
        >
          This is how your text will look with the current theme settings.
        </p>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            Action
          </button>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
            style={{ color: textColor }}
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3" style={{ backgroundColor: cardColor }}>
          <div className="text-xs font-medium" style={{ color: mutedColor }}>
            Title
          </div>
          <div
            className={`font-medium ${fontSizeMap[fontSize]}`}
            style={{ color: textColor }}
          >
            Heading
          </div>
        </div>
        <div className="rounded-lg border border-border p-3" style={{ backgroundColor: cardColor }}>
          <div className="text-xs font-medium" style={{ color: mutedColor }}>
            Body
          </div>
          <div
            className={`${fontSizeMap[fontSize]}`}
            style={{ color: textColor }}
          >
            Regular text
          </div>
        </div>
        <div className="rounded-lg border border-border p-3" style={{ backgroundColor: cardColor }}>
          <div className="text-xs font-medium" style={{ color: mutedColor }}>
            Accent
          </div>
          <div
            className="h-2 w-full rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>
    </motion.div>
  );
}
