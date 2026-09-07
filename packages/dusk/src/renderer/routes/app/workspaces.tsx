import WorkspacesPage from '@renderer/pages/workspaces/WorkspacesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/workspaces')({
  component: WorkspacesPage
})
