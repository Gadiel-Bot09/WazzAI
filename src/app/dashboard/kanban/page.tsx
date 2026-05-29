import { Suspense } from 'react'
import { KanbanClient } from '@/components/kanban/kanban-client'
import { getColumnsAction, getLeadsAction } from '@/actions/kanban'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Kanban de Leads | WazzAI',
}

async function KanbanDataFetcher() {
  const [columnsRes, leadsRes] = await Promise.all([
    getColumnsAction(),
    getLeadsAction()
  ])

  const columns = columnsRes.success ? columnsRes.data : []
  const leads = leadsRes.success ? leadsRes.data : []

  return <KanbanClient initialColumns={columns} initialLeads={leads} />
}

export default function KanbanPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center text-muted-foreground flex-col gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Cargando tablero...</p>
        </div>
      }>
        <KanbanDataFetcher />
      </Suspense>
    </div>
  )
}
