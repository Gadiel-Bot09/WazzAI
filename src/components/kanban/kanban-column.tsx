import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { KanbanCard } from './kanban-card'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KanbanColumnProps {
  column: any
  leads: any[]
}

export function KanbanColumn({ column, leads }: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 border-2 border-primary border-dashed rounded-xl w-80 h-[600px] flex-shrink-0 bg-background/50"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/30 rounded-xl w-80 flex-shrink-0 flex flex-col h-[calc(100vh-140px)]"
    >
      <div 
        {...attributes}
        {...listeners}
        className="p-4 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none border-b border-border/50 bg-muted/20 rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: column.color || '#3b82f6' }} 
          />
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <span className="bg-background text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium ml-2 shadow-sm border">
            {leads.length}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
        <SortableContext
          items={leads.map(lead => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        
        <Button variant="ghost" className="w-full justify-start text-muted-foreground text-sm border border-dashed border-border hover:border-primary/50">
          <Plus className="w-4 h-4 mr-2" />
          Añadir Lead
        </Button>
      </div>
    </div>
  )
}
