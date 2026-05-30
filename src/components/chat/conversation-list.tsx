'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Bot, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Filter = 'all' | 'open' | 'pending' | 'closed'

interface ConversationListProps {
  conversations: any[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
  showAssignedAgent?: boolean
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'closed', label: 'Cerrados' },
]

export function ConversationList({ conversations, activeId, onSelect, onDelete, showAssignedAgent }: ConversationListProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    return conversations.filter((conv) => {
      // Status filter
      if (filter !== 'all' && conv.status !== filter) return false
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const name = (conv.contact?.name || conv.contact?.phone_number || '').toLowerCase()
        const preview = (conv.last_message_preview || '').toLowerCase()
        if (!name.includes(q) && !preview.includes(q)) return false
      }
      return true
    })
  }, [conversations, search, filter])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación..."
            className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex border-b overflow-x-auto shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-colors ${
              filter === f.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            <span className="ml-1 text-[10px] opacity-60">
              {f.key === 'all'
                ? conversations.length
                : conversations.filter((c) => c.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground text-sm">
            {search ? 'No se encontraron conversaciones.' : 'No hay conversaciones en este filtro.'}
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = activeId === conv.id
            const contact = conv.contact

            return (
              <div
                key={conv.id}
                className={`group relative flex flex-col items-start p-4 border-b border-border transition-colors hover:bg-muted/50 text-left w-full ${
                  isActive ? 'bg-muted border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                }`}
              >
                {/* Trash button appears on hover */}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('¿Seguro que deseas eliminar este chat?')) {
                        onDelete(conv.id)
                      }
                    }}
                    className="absolute right-2 top-2 p-1.5 rounded-md bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive hover:text-destructive-foreground"
                    title="Eliminar chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => onSelect(conv.id)}
                  className="w-full flex flex-col text-left"
                >
                  <div className="flex w-full justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {contact?.name || contact?.phone_number || 'Desconocido'}
                    </span>
                    {conv.is_ai_active && (
                      <Bot className="w-3 h-3 text-violet-500 flex-shrink-0" aria-label="IA activa" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
                    {conv.last_message_at && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: es })}
                      </span>
                    )}
                    {showAssignedAgent && conv.assigned_user && (
                      <span className="text-[10px] text-primary/80 font-medium whitespace-nowrap truncate max-w-[80px]">
                        @{conv.assigned_user.full_name?.split(' ')[0] || 'Agente'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {conv.last_message_preview || 'Sin mensajes'}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}
