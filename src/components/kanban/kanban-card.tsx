import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MessageCircle, Clock, User } from 'lucide-react'

interface KanbanCardProps {
  lead: any
}

export function KanbanCard({ lead }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'Lead',
      lead,
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
        className="opacity-50 border-2 border-primary border-dashed rounded-lg h-32 bg-background/50"
      />
    )
  }

  const lastMessage = lead.conversations?.[0]?.last_message_preview || 'Sin mensajes aún'
  const timeAgo = lead.last_activity_at 
    ? new Date(lead.last_activity_at).toLocaleDateString()
    : 'Nuevo'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
          <div className="font-semibold text-sm truncate pr-2">
            {lead.title || lead.contact?.name || lead.contact?.phone_number}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <User className="h-3 w-3 mr-1" />
            <span className="truncate">{lead.contact?.phone_number}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground mb-3 line-clamp-2">
            <MessageCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{lastMessage}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {timeAgo}
            </div>
            {lead.priority === 'high' || lead.priority === 'urgent' ? (
              <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
                {lead.priority}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
