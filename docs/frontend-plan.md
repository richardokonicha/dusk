# Dusk — Frontend Implementation Plan

## 1. Project Structure

```
dusk/
├── packages/
│   ├── desktop/                    # Electron main process
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── index.ts        # Entry point
│   │   │   │   ├── container.ts    # Service container
│   │   │   │   ├── ipc/
│   │   │   │   │   ├── handlers.ts
│   │   │   │   │   └── channels.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── db.ts
│   │   │   │   │   ├── provider.ts
│   │   │   │   │   ├── agent-runtime.ts
│   │   │   │   │   ├── file-service.ts
│   │   │   │   │   ├── job-queue.ts
│   │   │   │   │   └── settings.ts
│   │   │   │   └── lifecycle.ts
│   │   │   └── preload/
│   │   │       └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── renderer/                   # React renderer process
│       ├── src/
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   ├── routes.tsx
│       │   │   ├── providers/
│       │   │   │   ├── ThemeProvider.tsx
│       │   │   │   ├── IPCProvider.tsx
│       │   │   │   └── WorkspaceProvider.tsx
│       │   │   └── layouts/
│       │   │       └── AppShell.tsx
│       │   │
│       │   ├── features/
│       │   │   ├── workspace/
│       │   │   │   ├── WorkspaceList.tsx
│       │   │   │   ├── WorkspaceCreate.tsx
│       │   │   │   └── WorkspaceSwitcher.tsx
│       │   │   │
│       │   │   ├── chat/
│       │   │   │   ├── ChatView.tsx
│       │   │   │   ├── MessageList.tsx
│       │   │   │   ├── MessageBubble.tsx
│       │   │   │   ├── MessageInput.tsx
│       │   │   │   └── StreamingIndicator.tsx
│       │   │   │
│       │   │   ├── agents/
│       │   │   │   ├── AgentList.tsx
│       │   │   │   ├── AgentCreate.tsx
│       │   │   │   ├── AgentDetail.tsx
│       │   │   │   └── AgentStatus.tsx
│       │   │   │
│       │   │   ├── files/
│       │   │   │   ├── FileBrowser.tsx
│       │   │   │   ├── FileTree.tsx
│       │   │   │   └── FilePreview.tsx
│       │   │   │
│       │   │   ├── settings/
│       │   │   │   ├── ProvidersSettings.tsx
│       │   │   │   ├── AgentsSettings.tsx
│       │   │   │   ├── ThemeSettings.tsx
│       │   │   │   └── GeneralSettings.tsx
│       │   │   │
│       │   │   └── welcome/
│       │   │       ├── WelcomeScreen.tsx
│       │   │       ├── Onboarding.tsx
│       │   │       └── ProviderSetup.tsx
│       │   │
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Input.tsx
│       │   │   │   ├── Modal.tsx
│       │   │   │   ├── Toast.tsx
│       │   │   │   └── ... (shadcn/ui components)
│       │   │   ├── layout/
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   ├── Panel.tsx
│       │   │   │   └── SplitPane.tsx
│       │   │   ├── chat/
│       │   │   │   ├── ChatContainer.tsx
│       │   │   │   ├── MessageBubble.tsx
│       │   │   │   └── MessageInput.tsx
│       │   │   └── agents/
│       │   │       ├── AgentStatus.tsx
│       │   │       └── AgentActivity.tsx
│       │   │
│       │   ├── hooks/
│       │   │   ├── useIPC.ts
│       │   │   ├── useWorkspace.ts
│       │   │   ├── useChat.ts
│       │   │   ├── useAgent.ts
│       │   │   └── useTheme.ts
│       │   │
│       │   ├── services/
│       │   │   ├── ipc-client.ts
│       │   │   ├── api-client.ts
│       │   │   └── event-bus.ts
│       │   │
│       │   ├── types/
│       │   │   ├── workspace.ts
│       │   │   ├── chat.ts
│       │   │   ├── agent.ts
│       │   │   ├── provider.ts
│       │   │   └── file.ts
│       │   │
│       │   ├── styles/
│       │   │   ├── globals.css
│       │   │   ├── themes.css
│       │   │   └── animations.css
│       │   │
│       │   ├── utils/
│       │   │   ├── format.ts
│       │   │   ├── markdown.ts
│       │   │   └── validators.ts
│       │   │
│       │   └── main.tsx
│       │
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── postcss.config.js
│
├── package.json                    # Root package.json
├── pnpm-workspace.yaml             # Workspace config
├── tsconfig.base.json              # Base TS config
└── electron-builder.yml            # Build config
```

---

## 2. Scaffold Commands

```bash
# 1. Create project root
mkdir -p dusk/packages/{desktop,renderer}
cd dusk

# 2. Initialize pnpm workspace
echo 'packages:
  - "packages/*"
' > pnpm-workspace.yaml

# 3. Root package.json
cat > package.json << 'EOF'
{
  "name": "dusk",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "pnpm --filter renderer dev",
    "build": "pnpm --filter desktop build",
    "test": "pnpm --filter '*' test",
    "lint": "pnpm --filter '*' lint",
    "typecheck": "pnpm --filter '*' typecheck"
  }
}
EOF

# 4. Desktop package
cd packages/desktop
pnpm init
pnpm add -D electron electron-builder vite typescript @types/node
pnpm add better-sqlite3

# 5. Renderer package
cd ../renderer
pnpm init
pnpm add react react-dom
pnpm add -D @types/react @types/react-dom vite @vitejs/plugin-react typescript
pnpm add tailwindcss @tailwindcss/vite
pnpm add class-variance-authority clsx tailwind-merge
pnpm add framer-motion
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip
pnpm add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-select @radix-ui/react-separator
pnpm add @radix-ui/react-scroll-area @radix-ui/react-avatar @radix-ui/react-progress
pnpm add lucide-react
pnpm add zustand
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @playwright/test
```

---

## 3. Core Components Plan

### 3.1 AppShell

```tsx
interface AppShellProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  rightPanel?: React.ReactNode;
  sidebarWidth?: number;
  rightPanelWidth?: number;
}

function AppShell({ sidebar, main, rightPanel, sidebarWidth = 240, rightPanelWidth = 320 }: AppShellProps) {
  return (
    <div className="flex h-screen bg-bg-primary">
      <aside style={{ width: sidebarWidth }} className="border-r border-border">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {main}
      </main>
      {rightPanel && (
        <aside style={{ width: rightPanelWidth }} className="border-l border-border">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
```

### 3.2 ChatView

```tsx
function ChatView({ conversationId }: { conversationId: string }) {
  const { messages, isLoading, sendMessage } = useChat(conversationId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <StreamingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border">
        <MessageInput value={input} onChange={setInput} onSend={handleSend} />
      </div>
    </div>
  );
}
```

### 3.3 MessageBubble

```tsx
const messageVariants = cva('flex gap-3', {
  variants: {
    role: {
      user: 'flex-row-reverse',
      assistant: 'flex-row',
      system: 'flex-row justify-center',
      tool: 'flex-row',
    },
  },
});

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={messageVariants({ role: message.role })}>
      <Avatar src={getAvatarUrl(message.role)} />
      <div className={`max-w-[80%] rounded-lg p-3 ${
        message.role === 'user' ? 'bg-dusk-500 text-white' : 'bg-bg-tertiary'
      }`}>
        <Markdown content={message.content} />
        <span className="text-xs opacity-50 mt-1 block">
          {formatTimestamp(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
```

---

## 4. State Management

### 4.1 Zustand Stores

```typescript
// stores/workspace.ts
interface WorkspaceStore {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  
  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (data: CreateWorkspace) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}

// stores/chat.ts
interface ChatStore {
  conversations: Conversation[];
  messages: Map<string, Message[]>;
  isLoading: boolean;
  
  loadConversations: (workspaceId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  stopStreaming: () => void;
}

// stores/agents.ts
interface AgentsStore {
  agents: AgentConfig[];
  activeAgents: Map<string, AgentState>;
  
  loadAgents: () => Promise<void>;
  invokeAgent: (agentId: string, input: string) => Promise<void>;
  stopAgent: (agentId: string) => Promise<void>;
}

// stores/settings.ts
interface SettingsStore {
  providers: ProviderConfig[];
  theme: string;
  customTheme: Partial<ThemeDefinition> | null;
  general: GeneralSettings;
  
  setTheme: (themeId: string) => void;
  addProvider: (config: CreateProvider) => Promise<void>;
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => void;
}
```

---

## 5. IPC Integration

### 5.1 Type-Safe IPC Wrapper

```typescript
// services/ipc-client.ts
import { ipcRenderer } from 'electron';

type IPCResponse<T> = { success: true; data: T } | { success: false; error: string };

class IPCClient {
  async invoke<T>(channel: string, ...args: any[]): Promise<T> {
    const response = await ipcRenderer.invoke<IPCResponse<T>>(channel, ...args);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }
  
  on(channel: string, callback: (data: any) => void): () => void {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
}

export const ipc = new IPCClient();

// Usage
const workspaces = await ipc.invoke<Workspace[]>('workspace:list');
const conversations = await ipc.invoke<Conversation[]>('conversation:list', workspaceId);

const unsubscribe = ipc.on('message:stream', (chunk) => {
  // Handle streaming message
});
```

---

## 6. Styling Strategy

### 6.1 TailwindCSS Setup

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dusk': {
          50: 'var(--dusk-50)',
          100: 'var(--dusk-100)',
          // ... full palette
          900: 'var(--dusk-900)',
        },
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border': 'var(--border)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 6.2 shadcn/ui Integration

```bash
# Initialize shadcn/ui
npx shadcn@latest init
# Select: TypeScript, Tailwind CSS, App Router (or Pages Router if not using React Router)
# Path alias: @/components

# Add components
npx shadcn@latest add button input modal toast tooltip tabs scroll-area avatar progress separator label select
```

### 6.3 Theme Provider

```tsx
// app/providers/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## 7. Routing

```typescript
// routes.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <WorkspaceList /> },
      { path: 'workspace/:workspaceId', element: <WorkspaceView /> },
      { path: 'workspace/:workspaceId/chat/:conversationId', element: <ChatView /> },
      { path: 'workspace/:workspaceId/agents', element: <AgentList /> },
      { path: 'workspace/:workspaceId/agents/:agentId', element: <AgentDetail /> },
      { path: 'workspace/:workspaceId/files', element: <FileBrowser /> },
      { path: 'settings', element: <SettingsView /> },
      { path: 'settings/providers', element: <ProvidersSettings /> },
      { path: 'settings/agents', element: <AgentsSettings /> },
      { path: 'settings/theme', element: <ThemeSettings /> },
    ],
  },
]);
```

---

## 8. Testing Strategy

### 8.1 Component Testing (Vitest + Testing Library)

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
  
  it('is disabled when loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 8.2 E2E Testing (Playwright)

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('creates workspace and sends message', async ({ page }) => {
    // Create workspace
    await page.click('text=New Workspace');
    await page.fill('input[name="name"]', 'Test Workspace');
    await page.click('button:has-text("Create")');
    
    // Verify workspace created
    await expect(page.locator('h1')).toContainText('Test Workspace');
    
    // Send message
    await page.fill('textarea', 'Hello, Dusk!');
    await page.click('button[aria-label="Send"]');
    
    // Wait for response
    await expect(page.locator('.message-assistant')).toBeVisible();
  });
});
```

---

## 9. Scaffold Script

Create a setup script for quick project initialization:

```bash
#!/bin/bash
# scripts/scaffold.sh

set -e

echo "🍒 Dusk — Project Scaffold"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm required"; exit 1; }

# Create directory structure
mkdir -p packages/{desktop,renderer}/{src,public}

# Root files
cat > package.json << 'EOF'
{
  "name": "dusk",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "pnpm --filter renderer dev",
    "build": "pnpm --filter desktop build",
    "test": "pnpm --filter '*' test",
    "lint": "pnpm --filter '*' lint",
    "typecheck": "pnpm --filter '*' typecheck"
  }
}
EOF

cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "packages/*"
EOF

cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./packages/renderer/src/*"],
      "@desktop/*": ["./packages/desktop/src/*"]
    }
  }
}
EOF

echo "✅ Scaffold complete. Run 'pnpm install' in each package."
```

---

*This plan is ready for implementation. Every structure, component, and pattern is defined.*
