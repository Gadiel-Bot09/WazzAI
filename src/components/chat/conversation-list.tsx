'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, CheckCheck, Clock } from 'lucide-react'

interface ConversationListProps {
  conversations: any[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ conversations, activeId, onSelect }: ConversationListProps) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground text-sm">
        No hay conversaciones activas. Cuando un cliente te escriba, aparecerá aquí.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {conversations.map((conv) => {
        const isActive = activeId === conv.id
        const contact = conv.contact
        
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`flex flex-col items-start p-4 border-b border-border transition-colors hover:bg-muted/50 text-left w-full ${
              isActive ? 'bg-muted border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
            }`}
          >
            <div className="flex w-full justify-between items-center mb-1">
              <span className="font-semibold text-sm truncate pr-2">
                {contact?.name || contact?.phone_number || 'Desconocido'}
              </span>
              {conv.last_message_at && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: es })}
                </span>
              )}
            </div>
            
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-muted-foreground truncate w-[85%]">
                {conv.last_message_preview || 'Sin mensajes'}
              </span>
              {conv.unread_count > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
