import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input
} from '@dusk/ui'
import { loggerService } from '@logger'
import { useInvalidateCache, useMutation, useQuery } from '@renderer/data/hooks/useDataApi'
import { useCloseConversationTabs } from '@renderer/hooks/tab'
import { ipcApi } from '@renderer/ipc'
import { toast } from '@renderer/services/toast'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, FolderKanban, FolderOpen, Loader2, MoreVertical, Pen, Plus, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
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
  const { trigger: updateWorkspace, isLoading: isUpdating } = useMutation('PATCH', '/agent-workspaces/:workspaceId', {
    refresh: ['/agent-workspaces']
  })
  const invalidateCache = useInvalidateCache()
  const closeConversationTabs = useCloseConversationTabs()

  const userWorkspaces = useMemo(
    () => (workspaces ?? []).filter((workspace) => workspace.type === 'user'),
    [workspaces]
  )

  const [renamingWorkspace, setRenamingWorkspace] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingWorkspace, setDeletingWorkspace] = useState<{ id: string; name: string; path: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isDeletingRef = useRef(false)

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

  const openRename = useCallback((workspace: { id: string; name: string }) => {
    setRenamingWorkspace(workspace)
    setRenameValue(workspace.name)
  }, [])

  const handleRename = useCallback(async () => {
    const workspace = renamingWorkspace
    const nextName = renameValue.trim()
    if (!workspace || isUpdating || !nextName) return

    if (nextName === workspace.name) {
      setRenamingWorkspace(null)
      return
    }

    try {
      await updateWorkspace({ params: { workspaceId: workspace.id }, body: { name: nextName } })
      setRenamingWorkspace(null)
      toast.success(t('workspaces.toast.updated'))
    } catch (error) {
      logger.error('Failed to rename workspace', error as Error, { workspaceId: workspace.id })
      toast.error(t('workspaces.toast.update_failed'))
    }
  }, [isUpdating, renameValue, renamingWorkspace, t, updateWorkspace])

  const handleDelete = useCallback(async () => {
    const workspace = deletingWorkspace
    if (!workspace || isDeletingRef.current) return
    isDeletingRef.current = true
    setIsDeleting(true)
    let hasSucceeded = false
    try {
      const result = await ipcApi.request('ai.agent.workspace.delete', { workspaceId: workspace.id })
      closeConversationTabs('agents', result.deletedIds)
      try {
        await Promise.all(
          ['/agent-sessions', '/agent-workspaces', '/pins', '/agent-channels', '/agent-tasks'].map((key) =>
            invalidateCache(key)
          )
        )
      } catch (error) {
        logger.warn('Failed to refresh after deleting workspace', error as Error, { workspaceId: workspace.id })
      }
      try {
        await invalidateCache(result.deletedIds.map((sessionId) => `/agent-sessions/${sessionId}`))
      } catch (error) {
        logger.warn('Failed to refresh deleted session details', error as Error, {
          workspaceId: workspace.id,
          sessionIds: result.deletedIds
        })
      }
      toast.success(t('workspaces.toast.deleted'))
      hasSucceeded = true
    } catch (error) {
      logger.error('Failed to delete workspace', error as Error, { workspaceId: workspace.id })
      toast.error(t('workspaces.toast.delete_failed'))
    } finally {
      isDeletingRef.current = false
      setIsDeleting(false)
    }

    if (hasSucceeded) {
      setDeletingWorkspace(null)
    }
  }, [closeConversationTabs, deletingWorkspace, invalidateCache, t])

  if (isLoading) return <Loader2 className="m-auto h-8 w-8 animate-spin text-muted-foreground" />
  if (error) return <p className="m-auto text-muted-foreground">{t('common.load_failed')}</p>

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-border border-b px-4 py-4">
        <div>
          <h1 className="font-semibold text-xl">{t('workspaces.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('workspaces.subtitle')}</p>
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
            <h2 className="font-medium text-foreground text-lg">{t('workspaces.empty.title')}</h2>
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
                    <p className="mt-1 truncate font-mono text-muted-foreground text-xs">{workspace.path}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={t('workspaces.action.open')}
                      onClick={() => navigate({ to: '/app/agents', search: { workspaceId: workspace.id } })}>
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title={t('common.more')}>
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openRename(workspace)}>
                          <Pen className="mr-2 h-4 w-4" />
                          {t('workspaces.action.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeletingWorkspace(workspace)} variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('workspaces.action.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog
        open={Boolean(renamingWorkspace)}
        onOpenChange={(open) => {
          if (!open && !isUpdating) setRenamingWorkspace(null)
        }}>
        <DialogContent closeOnOverlayClick={false} size="sm">
          <DialogHeader>
            <DialogTitle>{t('common.rename')}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            maxLength={128}
            aria-label={t('workspaces.field.name')}
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleRename()
              if (event.key === 'Escape' && !isUpdating) setRenamingWorkspace(null)
            }}
            disabled={isUpdating}
            className="h-9 rounded-md border-input bg-background"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={isUpdating} onClick={() => setRenamingWorkspace(null)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" loading={isUpdating} disabled={!renameValue.trim()} onClick={() => void handleRename()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deletingWorkspace ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeletingWorkspace(null)
          }}>
          <DialogContent
            motion="fade-scale"
            showCloseButton={false}
            closeOnOverlayClick={!isDeleting}
            className="max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('agent.session.workdir.delete.title')}</DialogTitle>
              <DialogDescription>
                {t('agent.session.workdir.delete.preview', { name: deletingWorkspace.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 space-y-3 overflow-y-auto">
              <div className="flex items-start gap-2 rounded-lg bg-background-subtle px-3 py-2 text-muted-foreground text-xs">
                <FolderOpen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <div className="min-w-0">
                  <p>{t('agent.session.workdir.delete.disk_preserved')}</p>
                  <p className="mt-0.5 break-all font-mono text-foreground">{deletingWorkspace.path}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={isDeleting} onClick={() => setDeletingWorkspace(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" loading={isDeleting} onClick={() => void handleDelete()}>
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
