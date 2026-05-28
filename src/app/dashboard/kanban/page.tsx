import { Suspense } from 'react'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { getColumnsAction, getLeadsAction } from '@/actions/kanban'
import { Loader2, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Kanban de Leads | WazzAI',
}

async function KanbanDataFetcher() {
  const [columnsRes, leadsRes] = await Promise.all([
    getColumnsAction(),
    getLeadsAction()
  ])

  if (!columnsRes.success || !leadsRes.success) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Error al cargar los datos del Kanban.
      </div>
    )
  }

  return <KanbanBoard initialColumns={columnsRes.data} initialLeads={leadsRes.data} />
}

export default function KanbanPage() {
  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header del Kanban */}
      <div className="h-14 border-b flex items-center justify-between px-6 bg-background">
        <div>
          <h1 className="font-semibold text-lg">Oportunidades Comerciales</h1>
          <p className="text-xs text-muted-foreground">Arrastra y suelta leads para cambiar su estado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings2 className="w-4 h-4 mr-2" />
            Personalizar Columnas
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Contenedor del Board (scrollable horizontalmente) */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center text-muted-foreground flex-col">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Cargando tablero...</p>
          </div>
        }>
          <KanbanDataFetcher />
        </Suspense>
      </div>
    </div>
  )
}
