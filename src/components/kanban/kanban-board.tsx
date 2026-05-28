'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { moveLeadAction } from '@/actions/kanban'
import { Loader2 } from 'lucide-react'

interface KanbanBoardProps {
  initialColumns: any[]
  initialLeads: any[]
}

export function KanbanBoard({ initialColumns, initialLeads }: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [leads, setLeads] = useState(initialLeads)

  // Sincronizar en caso de que lleguen nuevos props (por realtime en el futuro)
  useEffect(() => {
    setColumns(initialColumns)
    setLeads(initialLeads)
  }, [initialColumns, initialLeads])

  const [activeColumn, setActiveColumn] = useState<any | null>(null)
  const [activeLead, setActiveLead] = useState<any | null>(null)

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (!columns || columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No hay columnas configuradas. Crea una para comenzar.
      </div>
    )
  }

  function onDragStart(event: DragStartEvent) {
    const { active } = event
    const { data } = active

    if (data.current?.type === 'Column') {
      setActiveColumn(data.current.column)
      return
    }

    if (data.current?.type === 'Lead') {
      setActiveLead(data.current.lead)
      return
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveLead = active.data.current?.type === 'Lead'
    const isOverLead = over.data.current?.type === 'Lead'
    const isOverColumn = over.data.current?.type === 'Column'

    if (!isActiveLead) return

    // Estoy arrastrando un Lead sobre otro Lead
    if (isActiveLead && isOverLead) {
      setLeads((leads) => {
        const activeIndex = leads.findIndex((l) => l.id === activeId)
        const overIndex = leads.findIndex((l) => l.id === overId)

        if (leads[activeIndex].column_id !== leads[overIndex].column_id) {
          const updatedLeads = [...leads]
          updatedLeads[activeIndex].column_id = leads[overIndex].column_id
          return arrayMove(updatedLeads, activeIndex, overIndex)
        }

        return arrayMove(leads, activeIndex, overIndex)
      })
    }

    // Estoy arrastrando un Lead sobre una columna vacía
    if (isActiveLead && isOverColumn) {
      setLeads((leads) => {
        const activeIndex = leads.findIndex((l) => l.id === activeId)
        const updatedLeads = [...leads]
        updatedLeads[activeIndex].column_id = overId
        return arrayMove(updatedLeads, activeIndex, activeIndex)
      })
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null)
    setActiveLead(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    // Lógica para mover Columnas (si habilitamos arrastrar columnas)
    if (active.data.current?.type === 'Column') {
      // Implementación futura
      return
    }

    // Lógica para guardar el movimiento de Leads en base de datos
    if (active.data.current?.type === 'Lead') {
      const activeIndex = leads.findIndex((l) => l.id === activeId)
      const lead = leads[activeIndex]
      
      // Llamar al backend para actualizar
      try {
        await moveLeadAction(lead.id, lead.column_id, activeIndex * 1000)
      } catch (error) {
        console.error('Failed to move lead', error)
        // En caso de error podríamos hacer rollback del estado
      }
    }
  }

  return (
    <div className="flex h-full w-full overflow-x-auto p-6 gap-6 custom-scrollbar">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              leads={leads.filter((l) => l.column_id === col.id)}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeColumn && (
            <KanbanColumn
              column={activeColumn}
              leads={leads.filter((l) => l.column_id === activeColumn.id)}
            />
          )}
          {activeLead && <KanbanCard lead={activeLead} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
