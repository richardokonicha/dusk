import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ ipcRequest: vi.fn() }))

vi.stubGlobal('__APP_RELEASE_NOTES__', '<!--LANG:en-->English feature<!--LANG:END-->')
vi.stubGlobal('__APP_RELEASE_VERSION__', '2.0.2')
vi.stubGlobal('__APP_RELEASE_HISTORY__', [
  {
    releaseNotes: '<!--LANG:en-->Stale current<!--LANG:END-->',
    version: '2.0.2'
  },
  {
    releaseNotes: '<!--LANG:en-->Previous feature<!--LANG:END-->',
    version: '2.0.1'
  },
  {
    releaseNotes: '<!--LANG:en-->Older feature<!--LANG:END-->',
    version: '2.0.0'
  }
])

vi.mock('@renderer/components/ReleaseNotes', () => ({
  ReleaseNotes: ({ content }: { content: string }) => <div>{content}</div>
}))

vi.mock('@logger', () => ({
  loggerService: { withContext: () => ({ warn: vi.fn() }) }
}))

vi.mock('@renderer/ipc', () => ({
  ipcApi: { request: mocks.ipcRequest }
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'settings.about.releases.title' ? 'Release Notes' : key)
  })
}))

import ReleaseNotesPage from '../ReleaseNotesPage'

describe('ReleaseNotesPage', () => {
  beforeEach(() => {
    mocks.ipcRequest.mockReset().mockResolvedValue(null)
  })

  it('shows the bundled release notes with the markers stripped', () => {
    render(<ReleaseNotesPage />)

    expect(screen.getByRole('heading', { name: 'Release Notes' })).toBeInTheDocument()
    expect(screen.getAllByText('v2.0.2')).toHaveLength(2)
    expect(screen.getByText('English feature')).toBeInTheDocument()
    expect(screen.queryByText('Stale current')).not.toBeInTheDocument()
  })

  it('shows bundled history in version order while the release service has nothing newer', async () => {
    const user = userEvent.setup()

    render(<ReleaseNotesPage />)

    const versionTriggers = screen.getAllByRole('button')
    expect(versionTriggers.map((trigger) => trigger.textContent)).toEqual(['v2.0.2', 'v2.0.1', 'v2.0.0'])
    expect(versionTriggers[0]).toHaveAttribute('aria-expanded', 'true')
    expect(versionTriggers[1]).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Previous feature')).not.toBeInTheDocument()

    await user.click(versionTriggers[1])

    expect(versionTriggers[1]).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Previous feature')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(mocks.ipcRequest).toHaveBeenCalledWith('app.updater.release_notes.get')
  })

  it('merges and expands release history from the managed update service', async () => {
    const user = userEvent.setup()
    mocks.ipcRequest.mockResolvedValue([
      {
        releaseNotes: '<!--LANG:en-->Remote feature<!--LANG:END-->',
        version: '2.0.3'
      },
      {
        releaseNotes: '<!--LANG:en-->Remote current<!--LANG:END-->',
        version: '2.0.2'
      }
    ])

    render(<ReleaseNotesPage />)

    expect(await screen.findByText('Remote feature')).toBeInTheDocument()
    const versionTriggers = screen.getAllByRole('button')
    expect(versionTriggers.map((trigger) => trigger.textContent)).toEqual(['v2.0.3', 'v2.0.2', 'v2.0.1', 'v2.0.0'])
    expect(versionTriggers[0]).toHaveAttribute('aria-expanded', 'true')
    expect(versionTriggers[1]).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('English feature')).not.toBeInTheDocument()

    await user.click(versionTriggers[1])
    expect(screen.getByText('Remote current')).toBeInTheDocument()
  })

  it('keeps bundled release history when the managed update service is unavailable', async () => {
    mocks.ipcRequest.mockRejectedValue(new Error('offline'))

    render(<ReleaseNotesPage />)

    await waitFor(() => expect(mocks.ipcRequest).toHaveBeenCalledOnce())
    expect(screen.getAllByText('v2.0.2')).toHaveLength(2)
    expect(screen.getByText('English feature')).toBeInTheDocument()
    expect(screen.queryByText('Remote feature')).not.toBeInTheDocument()
  })
})
