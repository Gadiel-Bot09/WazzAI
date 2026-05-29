'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { NewLeadModal } from '@/components/kanban/new-lead-modal'
import { ManageColumnsModal } from '@/components/kanban/manage-columns-modal'
import { Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KanbanClientProps {
  initialColumns: any[]
  initialLeads: any[]
}

export function KanbanClient({ initialColumns, initialLeads }: KanbanClientProps) {
  const [showNewLead, setShowNewLead] = useState(false)
  const [showManageCols, setShowManageCols] = useState(false)

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
        <div>
          <h1 className="font-semibold text-lg">Oportunidades Comerciales</h1>
          <p className="text-xs text-muted-foreground">Arrastra y suelta leads para cambiar su estado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowManageCols(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            Personalizar Columnas
          </Button>
          <Button size="sm" onClick={() => setShowNewLead(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialColumns={initialColumns} initialLeads={initialLeads} />
      </div>

      {/* Modals */}
      <NewLeadModal
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        columns={initialColumns}
      />
      <ManageColumnsModal
        open={showManageCols}
        onClose={() => setShowManageCols(false)}
        columns={initialColumns}
      />
    </div>
  )
}
