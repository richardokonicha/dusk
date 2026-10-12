import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsPage from '../SettingsPage'

const { isMacTransparentWindowMock, navigateMock } = vi.hoisted(() => ({
  isMacTransparentWindowMock: vi.fn(),
  navigateMock: vi.fn()
}))

vi.mock('@dusk/ui', () => ({
  MenuDivider: () => <hr data-testid="menu-divider" />,
  MenuItem: ({ icon, label, onClick }: { icon?: ReactNode; label: string; onClick?: () => void }) => (
    <button type="button" data-testid="menu-item" onClick={onClick}>
      {icon}
      {label}
    </button>
  ),
  MenuList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <header>
      {title}
      {action}
    </header>
  ),
  SearchInput: (props: {
    value: string
    placeholder?: string
    onChange: (e: { target: { value: string } }) => void
    onKeyDown?: (e: { key: string; preventDefault: () => void }) => void
  }) => (
    <input
      data-testid="settings-search-input"
      value={props.value}
      placeholder={props.placeholder}
      onChange={props.onChange}
      onKeyDown={props.onKeyDown}
    />
  )
}))

vi.mock('@renderer/components/Scrollbar', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

vi.mock('@renderer/hooks/useMacTransparentWindow', () => ({
  default: () => isMacTransparentWindowMock()
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => null,
  useLocation: () => ({ pathname: '/settings/provider' }),
  useNavigate: () => navigateMock,
  useRouter: () => ({ history: { canGoBack: () => false, back: vi.fn() } }),
  useSearch: () => ({})
}))

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'agent.settings.toolsMcp.mcp.tab': 'MCP',
        'selection.name': 'Selection Assistant',
        'settings.appearance.title': 'Appearance',
        'settings.channels.title': 'Channels',
        'settings.dependencies.title': 'Dependencies',
        'settings.dependencies.localModels.title': 'Local Models',
        'settings.general.common.title': 'General',
        'settings.menuGroups.automation': 'Efficiency',
        'settings.menuGroups.capabilities': 'Tool',
        'settings.menuGroups.personal': 'Preferences',
        'settings.menuGroups.quickAccess': 'Quick Access',
        'settings.menuGroups.system': 'System',
        'settings.model': 'Default model',
        'settings.prompts.title': 'Prompt',
        'settings.quickAssistant.title': 'Quick Assistant',
        'settings.scheduledTasks.title': 'Scheduler',
        'settings.screenshot.title': 'Screenshot',
        'settings.shortcuts.title': 'Keymap',
        'settings.skills.title': 'Skills',
        'settings.system.title': 'System',
        'settings.tool.file_processing.features.image_to_text.title': 'OCR',
        'settings.tool.file_processing.features.document_to_markdown.title': 'File Processing'
      })[key] ?? key
  })
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    isMacTransparentWindowMock.mockReturnValue(false)
    navigateMock.mockReset()
  })

  it('mounts the full-width search field from the header icon only on demand', () => {
    // Off the search page: no field in the DOM, just the quiet header icon
    render(<SettingsPage />)
    expect(screen.queryByTestId('settings-search-input')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'settings.search.placeholder' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'settings.search.placeholder' }))
    expect(screen.getByTestId('settings-search-input')).toBeInTheDocument()

    // Empty-field Escape reports collapse; the page unmounts the field again
    fireEvent.keyDown(screen.getByTestId('settings-search-input'), { key: 'Escape' })
    expect(screen.queryByTestId('settings-search-input')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'settings.search.placeholder' })).toBeInTheDocument()
  })

  it('places General directly above Appearance and local models directly below the default model', () => {
    const { container } = render(<SettingsPage />)

    expect(container.querySelector('[data-ui="settings.view"]')).toBeInTheDocument()
    expect(container.querySelector('[data-ui="settings.navigation"]')).toBeInTheDocument()
    expect(container.querySelector('[data-ui="settings.content"]')).toBeInTheDocument()
    expect(screen.getByText('Preferences')).toBeInTheDocument()

    const generalItem = screen.getByRole('button', { name: 'General' })
    const appearanceItem = screen.getByRole('button', { name: 'Appearance' })
    const defaultModelItem = screen.getByRole('button', { name: 'Default model' })
    const localModelsItem = screen.getByRole('button', { name: 'Local Models' })

    expect(generalItem.nextElementSibling).toBe(appearanceItem)
    expect(defaultModelItem.nextElementSibling).toBe(localModelsItem)
    fireEvent.click(generalItem)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/settings/general' })
    fireEvent.click(localModelsItem)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/settings/local-models' })
  })

  it('keeps document processing and OCR together in tools and dependencies in the system group', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Tool')).toBeInTheDocument()

    const documentProcessingItem = screen.getByRole('button', { name: 'File Processing' })
    const ocrItem = screen.getByRole('button', { name: 'OCR' })
    expect(documentProcessingItem.nextElementSibling).toBe(ocrItem)
    expect(ocrItem.nextElementSibling).toHaveAttribute('data-testid', 'menu-divider')

    const dependenciesItem = screen.getByRole('button', { name: 'Dependencies' })
    expect(screen.queryByRole('button', { name: 'System' })).not.toBeInTheDocument()
    expect(screen.getByText('System').nextElementSibling).toBe(dependenciesItem)
    fireEvent.click(dependenciesItem)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/settings/dependencies' })
  })

  it('places Skills below MCP and prompt management directly below Skills', () => {
    render(<SettingsPage />)

    const mcpItem = screen.getByText('MCP').closest('button')
    const skillsItem = screen.getByRole('button', { name: 'Skills' })

    expect(mcpItem).not.toBeNull()
    expect(mcpItem?.nextElementSibling).toBe(skillsItem)
    fireEvent.click(skillsItem)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/settings/skills' })

    const promptsItem = screen.getByRole('button', { name: 'Prompt' })
    expect(skillsItem.nextElementSibling).toBe(promptsItem)
    fireEvent.click(promptsItem)
    expect(navigateMock).toHaveBeenCalledWith({ to: '/settings/prompts' })
  })

  it('merges quick access into efficiency and places both assistants last', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Efficiency')).toBeInTheDocument()
    expect(screen.queryByText('Quick Access')).not.toBeInTheDocument()

    const efficiencyItems = [
      'Channels',
      'Scheduler',
      'Keymap',
      'Quick Assistant',
      'Selection Assistant',
      'Screenshot'
    ].map((name) => screen.getByRole('button', { name }))
    const menuItems = screen.getAllByTestId('menu-item')
    const efficiencyStart = menuItems.indexOf(efficiencyItems[0])

    expect(menuItems.slice(efficiencyStart, efficiencyStart + efficiencyItems.length)).toEqual(efficiencyItems)
    expect(efficiencyItems.at(-1)?.nextElementSibling).toHaveAttribute('data-testid', 'menu-divider')
  })
})
