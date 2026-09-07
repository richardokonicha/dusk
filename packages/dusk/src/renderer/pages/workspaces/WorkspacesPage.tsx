import { Button } from '@dusk/ui'
import { loggerService } from '@logger'
import { useMutation, useQuery } from '@renderer/data/hooks/useDataApi'
import { toast } from '@renderer/services/toast'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, FolderKanban, FolderOpen, Loader2, Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('WorkspacesPage')

export default function WorkspacesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const { data: workspaces, isLoading, error } = useQuery('/agent-workspaces')
  const { trigger: createWorkspace, isLoading: isCreating } = useMutation('POST', '/agent-workspaces', {
    refresh: ['/agent-workspaces']
  })

  const userWorkspaces = useMemo(
    () => (workspaces ?? []).filter((workspace) => workspace.type === 'user'),
    [workspaces]
  )

  const handleCreate = useCallback(async () => {
    setCreating(false)
    try {
      const path = await window.api.file.selectFolder({ properties: ['openDirectory', 'createDirectory'] })
      if (!path) return
      await createWorkspace({ body: { path } })
      toast.success(t('workspaces.toast.created'))
    } catch (error) {
      logger.error('Failed to create workspace', error as Error)
      toast.error(t('workspaces.toast.create_failed'))
    }
  }, [createWorkspace, t])

  if (isLoading) return <Loader2 className="m-auto h-8 w-8 animate-spin text-muted-foreground" />
  if (error) return <p className="m-auto text-muted-foreground">{t('common.load_failed')}</p>

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <h1 className="text-xl font-semibold">{t('workspaces.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('workspaces.subtitle')}</p>
        </div>
        <Button onClick={() => void handleCreate()} disabled={creating || isCreating} className="gap-2">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('workspaces.action.create')}
        </Button>
      </header>
      <main className="flex-1 overflow-auto p-4">
        {userWorkspaces.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <FolderKanban className="h-10 w-10" />
            <h2 className="text-lg font-medium text-foreground">{t('workspaces.empty.title')}</h2>
            <p className="max-w-sm">{t('workspaces.empty.description')}</p>
            <Button variant="outline" onClick={() => void handleCreate()} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              {t('workspaces.action.pick_folder')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {userWorkspaces.map((workspace) => (
              <article key={workspace.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{workspace.name}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{workspace.path}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title={t('workspaces.action.open')}
                    onClick={() => navigate({ to: '/app/agents', search: { workspaceId: workspace.id } })}>
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
