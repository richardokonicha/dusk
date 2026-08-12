# Dusk — Design System

## 1. Brand Identity

### 1.1 Logo Concept

**Wordmark:** "Dusk" set in a custom geometric sans-serif. The "D" has a subtle curve suggesting the arc of twilight.

**Icon:** A minimal dusk gradient — dark blue to warm amber, suggesting the transition from day to night. Abstract, not literal.

**Usage:**
- App icon: Dusk icon on dark background
- Splash screen: Wordmark centered, icon above
- Favicon: Icon only
- Never use Chinese characters or calligraphy styles

### 1.2 Color Palette

**Primary Palette (Dusk Twilight)**
```css
--dusk-50:  #f5f3ff;   /* lightest - backgrounds */
--dusk-100: #ede9fe;
--dusk-200: #ddd6fe;
--dusk-300: #c4b5fd;
--dusk-400: #a78bfa;
--dusk-500: #8b5cf6;   /* primary accent */
--dusk-600: #7c3aed;   /* hover states */
--dusk-700: #6d28d9;
--dusk-800: #5b21b6;
--dusk-900: #4c1d95;   /* darkest */
```

**Accent Palette (Warm Amber)**
```css
--amber-400: #fbbf24;  /* highlights, active states */
--amber-500: #f59e0b;  /* primary warm accent */
--amber-600: #d97706;  /* hover */
```

**Neutral Palette**
```css
--gray-50:  #f9fafb;   /* light bg */
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;   /* secondary text */
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;   /* primary text on light */
--gray-900: #111827;   /* darkest text */
```

**Dark Theme (Dusk Night)**
```css
--bg-primary:   #0f0f1a;    /* main background */
--bg-secondary: #1a1a2e;    /* panels, sidebar */
--bg-tertiary:  #252542;    /* cards, elevated */
--bg-hover:     #2d2d4a;    /* hover states */
--text-primary: #e2e8f0;    /* main text */
--text-secondary: #a0aec0; /* muted text */
--border:       #2d2d4a;    /* borders */
```

**Semantic Colors**
```css
--success: #10b981;
--warning: #f59e0b;
--error:   #ef4444;
--info:    #3b82f6;
```

### 1.3 Typography

**Font Stack**
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

**Type Scale**
```css
--text-xs:   0.75rem;    /* 12px - captions */
--text-sm:   0.875rem;   /* 14px - secondary */
--text-base: 1rem;       /* 16px - body */
--text-lg:   1.125rem;   /* 18px - lead */
--text-xl:   1.25rem;    /* 20px - h3 */
--text-2xl:  1.5rem;     /* 24px - h2 */
--text-3xl:  1.875rem;   /* 30px - h1 */
--text-4xl:  2.25rem;    /* 36px - display */
```

**Font Weights**
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Line Heights**
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 1.4 Spacing & Layout Grid

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */

--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.5rem;   /* 8px */
--radius-lg: 0.75rem;  /* 12px */
--radius-xl: 1rem;     /* 16px */
--radius-full: 9999px; /* circles */
```

**Grid**
- 12-column grid
- 16px base unit
- Gutters: 16px (desktop), 8px (mobile)
- Max width: 1440px

---

## 2. Design Tokens

### 2.1 Semantic Color Roles

The design system exposes nine semantic color roles. Each role maps to a specific CSS custom property that conveys intent, not value. Components reference roles (e.g., `--color-primary`) rather than raw values, enabling theme switching without touching component code.

**Canonical semantic tokens:**

| Role | Public Token | Underlying Token | Light Value | Dark Value | Purpose |
|---|---|---|---|---|---|
| Background | `--color-background` | `--background` → `--bg` | `#fafaf9` | `#0c0a09` | Page and app shell background |
| Foreground | `--color-foreground` | `--foreground` → `--fg` | `#1c1917` | `#fafaf9` | Primary text |
| Primary | `--color-primary` | `--primary` → `--accent` | `#8b5cf6` | `#a78bfa` | Key actions, links, active states |
| Secondary | `--color-secondary` | `--secondary` → `--bg-secondary` | `#f5f5f4` | `#1c1917` | Secondary actions, subtler surfaces |
| Accent | `--color-accent` | `--accent` | `#8b5cf6` | `#a78bfa` | Highlighted regions, selection |
| Destructive | `--color-destructive` | `--destructive` → `--error` | `#ef4444` | `#f87171` | Dangerous actions, error states |
| Muted | `--color-muted` | `--muted` → `--bg-secondary` | `#f5f5f4` | `#1c1917` | Disabled text, subtle backgrounds |
| Border | `--color-border` | `--border` | `#e7e5e4` | `#292524` | Dividers, field outlines |
| Ring | `--color-ring` | `--ring` | `#8b5cf6` | `#a78bfa` | Focus indicator ring |

**Derived roles** pair foreground with background:

```css
--color-card: var(--background);
--color-card-foreground: var(--foreground);
--color-popover: var(--background);
--color-popover-foreground: var(--foreground);
--color-primary-foreground: var(--fg-on-accent);
--color-secondary-foreground: var(--foreground);
--color-muted-foreground: var(--fg-muted);
--color-destructive-foreground: var(--error-foreground);
--color-input: var(--border);
```

### 2.2 State Tokens

Interactive elements express state through dedicated tokens. All state tokens are defined in the `:root` selector and override in theme variants.

```css
/* Hover — elevated surfaces on pointer-over */
--bg-hover: #f0efef;
--accent-hover: #7c3aed;

/* Active — pressed/selected state */
--bg-active: #e7e5e4;

/* Focus — keyboard navigation ring */
--ring: #8b5cf6;

/* Disabled — inactive, non-interactive */
--disabled: #a8a29e;
--disabled-bg: #f5f5f4;
--fg-muted: #a8a29e;

/* Readonly — visible but non-editable */
--readonly: #f5f5f4;
--readonly-border: #e7e5e4;
```

**State token usage by interaction type:**

| Interaction | Token(s) | Behavior |
|---|---|---|
| Hover | `--bg-hover`, `--accent-hover` | Shift background or foreground 1 step darker |
| Active | `--bg-active` | Immediate opacity/contrast response on press |
| Focus | `--ring` | 2px ring with 2px offset, visible on `:focus-visible` |
| Disabled | `--disabled`, `--disabled-bg` | Muted foreground on subdued background |
| Readonly | `--readonly`, `--readonly-border` | No interaction feedback, distinct border |

### 2.3 Elevation & Shadows

Surfaces stack via shadow, not color. Higher layers receive deeper shadows.

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);    /* inline elements */
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);  /* cards, panels */
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); /* modals, dialogs */
```

Dark theme doubles shadow opacity to maintain legibility against dark surfaces.

### 2.4 Z-Index Scale

Overlays and floating UI follow a fixed z-index scale to prevent stacking conflicts.

| Layer | Token | Range | Components |
|---|---|---|---|
| Base | — | 0 | Page content, scrollable areas |
| Overlay 1 | `z-[1]` | 1 | Decorative overlays, scroll buttons |
| Sticky | `z-[2]` | 2 | Sticky headers, table row headers |
| Floating toolbar | `z-[5]` | 5 | Image toolbars, inline actions |
| Surface | `z-[10]` | 10 | Dropdowns, dropdown menus |
| Overlay | `z-[40]` | 40 | Modal backdrops |
| Modal | `z-[50]` | 50 | Modal dialogs, drawers |
| Popover | `z-[80]` | 80 | Popovers, tooltips, hover cards, dialogs |
| Confirm | `z-[90]` | 90 | Confirm dialogs, global search |
| Toast | `z-[100]` | 100 | Toast notifications |
| Find bar | `z-[999]` | 999 | In-page search bar |
| Window chrome | `z-[9999]` | 9999 | Title bar, OS controls |

### 2.5 Motion Tokens

All transitions use the default easing curve unless a spring animation is explicitly required.

```css
--duration-fast: 150ms;    /* micro-interactions, hover states */
--duration-normal: 250ms;  /* standard transitions */
--duration-slow: 350ms;    /* entrance animations, layout shifts */
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
```

**Motion principles:**
- Animate no more than 3 properties simultaneously
- Use `--duration-fast` for hover/active feedback, `--duration-normal` for state changes, `--duration-slow` for enter/exit
- Respect `prefers-reduced-motion` — disable all non-essential animations

### 2.6 Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px — base unit */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

Base grid: 12-column, 16px unit, max-width 1440px.

### 2.7 Theme Variants

**Light Theme (default)**
```css
[data-theme="light"] {
  --bg: #fafaf9;
  --bg-secondary: #f5f5f4;
  --bg-tertiary: #e7e5e4;
  --bg-elevated: #ffffff;
  --bg-hover: #f0efef;
  --bg-active: #e7e5e4;
  --fg: #1c1917;
  --fg-secondary: #57534e;
  --fg-muted: #a8a29e;
  --fg-on-accent: #ffffff;
  --accent: #8b5cf6;
  --accent-hover: #7c3aed;
  --accent-muted: #ddd6fe;
  --border: #e7e5e4;
  --border-muted: #f5f5f4;
  --ring: #8b5cf6;
  --success: #22c55e;
  --success-foreground: #ffffff;
  --warning: #f59e0b;
  --warning-foreground: #1c1917;
  --error: #ef4444;
  --error-foreground: #ffffff;
  --info: #3b82f6;
  --info-foreground: #ffffff;
  --disabled: #a8a29e;
  --disabled-bg: #f5f5f4;
  --readonly: #f5f5f4;
  --readonly-border: #e7e5e4;
}
```

**Dark Theme (default)**
```css
[data-theme="dark"] {
  --bg: #0c0a09;
  --bg-secondary: #1c1917;
  --bg-tertiary: #292524;
  --bg-elevated: #1c1917;
  --bg-hover: #292524;
  --bg-active: #44403c;
  --fg: #fafaf9;
  --fg-secondary: #a8a29e;
  --fg-muted: #78716c;
  --fg-on-accent: #ffffff;
  --accent: #a78bfa;
  --accent-hover: #8b5cf6;
  --accent-muted: #4c1d95;
  --border: #292524;
  --border-muted: #1c1917;
  --ring: #a78bfa;
  --success: #4ade80;
  --success-foreground: #1c1917;
  --warning: #fbbf24;
  --warning-foreground: #1c1917;
  --error: #f87171;
  --error-foreground: #1c1917;
  --info: #60a5fa;
  --info-foreground: #1c1917;
  --disabled: #78716c;
  --disabled-bg: #292524;
  --readonly: #292524;
  --readonly-border: #44403c;
}
```

**Custom Theme API**
```typescript
interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography?: Partial<ThemeTypography>;
  author?: string;
}

interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  fg: string;
  fgSecondary: string;
  fgMuted: string;
  accent: string;
  accentHover: string;
  border: string;
  ring: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}
```

---

## 3. Component Library Plan

### 3.1 Core Components

**Layout**
- `AppShell` — main app frame (sidebar + main + optional right panel)
- `Sidebar` — navigation sidebar
- `Panel` — right-side panel (details, properties)
- `SplitPane` — resizable split view
- `Breadcrumb` — navigation breadcrumbs

**Navigation**
- `NavItem` — sidebar navigation item
- `NavGroup` — collapsible nav group
- `Tabs` — tab navigation
- `Breadcrumb` — breadcrumb navigation

**Chat**
- `ChatContainer` — chat message list with scrolling
- `MessageBubble` — individual message (user/assistant/system/tool)
- `MessageInput` — text input with send button
- `StreamingIndicator` — typing/streaming animation
- `AgentStatus` — agent state indicator (idle/working/awaiting)

**Forms**
- `Input` — text input
- `Textarea` — multi-line input
- `Select` — dropdown
- `Checkbox` — checkbox
- `Switch` — toggle switch
- `Button` — primary/secondary/ghost/icon variants
- `Slider` — range input

**Feedback**
- `Spinner` — loading indicator
- `ProgressBar` — task progress
- `Toast` — notification toast
- `Alert` — alert banner
- `Badge` — status badge
- `ErrorBoundary` — catches render errors and displays fallback UI

**Overlays**
- `Modal` — modal dialog
- `Drawer` — slide-out panel
- `Tooltip` — tooltip
- `Popover` — popover menu

**Data Display**
- `Avatar` — user/agent avatar
- `Card` — content card
- `Table` — data table
- `CodeBlock` — syntax-highlighted code
- `FileIcon` — file type icon
- `TreeView` — file tree
- `EmptyState` — empty state placeholder with icon, title, description, and actions
- `Skeleton` — loading placeholder for content

### 3.2 Component API Conventions

```typescript
// All components accept:
interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  'data-testid'?: string;
}

// Variants use class-variance-authority pattern:
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-dusk-500 text-white hover:bg-dusk-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        ghost: 'hover:bg-gray-100 text-gray-700',
        danger: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = VariantProps<typeof buttonVariants> & BaseComponentProps;
```

### 3.3 Interaction Patterns

**Hover:** `background-color` shift, slight scale (1.02) for cards
**Focus:** 2px ring in accent color, 2px offset
**Active:** Slight opacity reduction (0.9), immediate response
**Disabled:** 50% opacity, `cursor: not-allowed`, no hover effects
**Loading:** Spinner in place of content, button disabled

### 3.4 Motion Guidelines (Framer Motion)

```typescript
// Standard transitions
const transitions = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  normal: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
};

// Common animations
const animations = {
  fadeIn: { opacity: [0, 1], transition: transitions.normal },
  slideIn: { x: [-20, 0], opacity: [0, 1], transition: transitions.normal },
  scaleIn: { scale: [0.95, 1], opacity: [0, 1], transition: transitions.fast },
  pulse: { 
    scale: [1, 1.05, 1], 
    transition: { duration: 0.6, repeat: Infinity } 
  },
};
```

**Motion Principles:**
- Keep animations subtle and purposeful
- Never animate more than 3 properties simultaneously
- Respect `prefers-reduced-motion`
- Use spring physics for interactive elements, easing for transitions

---

## 4. Layout Patterns

### 4.1 Workspace Layout

```
┌──────────┬──────────────────────────────┬──────────────┐
│          │                              │              │
│ Sidebar  │      Main Content            │ Right Panel  │
│          │                              │  (optional)  │
│ 240px    │      flex-1                  │  320px       │
│          │                              │              │
│          │                              │              │
│          │                              │              │
└──────────┴──────────────────────────────┴──────────────┘
```

**Sidebar:** Workspace switcher, navigation (Conversations, Agents, Files, Settings), Fugoku status
**Main:** Context-dependent (chat, file browser, agent config)
**Right Panel:** Context-dependent (agent details, file preview, conversation info)

### 4.2 Chat Interface

```
┌──────────────────────────────────────────────────────────┐
│  # conversation-title                          ● ● ●     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [User Avatar]  User message content               │  │
│  │                 timestamp                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Agent Avatar]  Assistant response                 │  │
│  │                  markdown content...                │  │
│  │                  code block if needed               │  │
│  │                  timestamp                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  [Tool]  Tool execution: read_file                 │  │
│  │          Result: ...                                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │ Type your message...                      [Send]  │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Agent Activity Indicators

- **Idle:** Gray dot, no animation
- **Active/Streaming:** Pulsing amber dot, subtle glow
- **Working:** Spinning indicator, progress bar if available
- **Awaiting Input:** Amber dot with "?" badge
- **Error:** Red dot, error state visible
- **Completed:** Green checkmark (brief, then fades)

---

## 5. Accessibility Requirements

### 5.1 WCAG 2.1 AA Compliance

- **Color contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus indicators:** 2px visible ring on all interactive elements
- **Keyboard navigation:** All features accessible via keyboard
- **Screen reader support:** ARIA labels on all interactive elements
- **Text resizing:** Support up to 200% zoom without loss of content
- **Motion:** Respect `prefers-reduced-motion`

### 5.2 Keyboard Shortcuts

```
Ctrl/Cmd + N     New conversation
Ctrl/Cmd + ,     Open settings
Ctrl/Cmd + /     Toggle sidebar
Ctrl/Cmd + K     Command palette
Ctrl/Cmd + Shift + C  Copy last response
Ctrl/Cmd + Shift + E  Export conversation
Ctrl/Cmd + ,     Settings
Esc              Close modal/drawer
Tab              Navigate forward
Shift + Tab      Navigate backward
```

---

## 6. Theme Engine Architecture

### 6.1 Theme Structure

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    accent: string;
    accentHover: string;
  };
  fonts?: {
    sans?: string;
    mono?: string;
  };
  radius?: {
    sm: string;
    md: string;
    lg: string;
  };
}
```

### 6.2 Theme Provider

```typescript
interface ThemeContextValue {
  theme: ThemeDefinition;
  availableThemes: ThemeDefinition[];
  setTheme: (themeId: string) => void;
  customTheme: Partial<ThemeDefinition> | null;
  setCustomTheme: (theme: Partial<ThemeDefinition>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>('dusk-dark');
  const [customTheme, setCustomTheme] = useState<Partial<ThemeDefinition> | null>(null);
  
  const theme = useMemo(() => {
    if (customTheme) {
      return mergeThemes(baseThemes[currentTheme], customTheme);
    }
    return baseThemes[currentTheme];
  }, [currentTheme, customTheme]);
  
  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, availableThemes, setTheme, customTheme, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 6.3 Custom Theme Creation

Users can:
- Select accent color (color picker)
- Choose font family
- Adjust density (compact/comfortable/spacious)
- Save custom theme as preset
- Export/import theme as JSON

---

*This design system is ready for implementation. All values are concrete, all patterns are defined.*
