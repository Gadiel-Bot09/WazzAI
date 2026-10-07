'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Bot, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Filter = 'inbox' | 'mine' | 'ai' | 'closed'

interface ConversationListProps {
  conversations: any[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
  showAssignedAgent?: boolean
  currentUser?: any
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'inbox', label: 'Bandeja' },
  { key: 'mine', label: 'Míos' },
  { key: 'ai', label: 'IA' },
  { key: 'closed', label: 'Cerrados' },
]

export function ConversationList({ conversations, activeId, onSelect, onDelete, showAssignedAgent, currentUser }: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return conversations.filter((conv) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const name = (conv.contact?.name || conv.contact?.phone_number || '').toLowerCase()
        const preview = (conv.last_message_preview || '').toLowerCase()
        if (!name.includes(q) && !preview.includes(q)) return false
      }
      return true
    })
  }, [conversations, search])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-3 border-b bg-white/50 dark:bg-background/50 backdrop-blur-sm z-10 sticky top-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-emerald-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación..."
            className="pl-9 h-9 text-sm bg-slate-100 dark:bg-slate-800/50 border-transparent focus-visible:ring-emerald-500/50 rounded-xl transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center animate-wz-fade-in">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <Search className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {search ? 'Sin resultados' : 'Bandeja vacía'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              {search ? 'Intenta con otro término de búsqueda.' : 'No hay chats en esta categoría por ahora.'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((conv) => {
              const isActive = activeId === conv.id
              const contact = conv.contact

              return (
                <div
                  key={conv.id}
                  className={`group relative flex flex-col items-start p-3 rounded-xl transition-all duration-200 text-left w-full cursor-pointer animate-wz-fade-up ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 shadow-sm border border-emerald-500/20'
                      : 'hover:bg-white/60 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                  onClick={() => onSelect(conv.id)}
                >
                  {/* Indicador de activo a la izquierda (pill) */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 brand-gradient rounded-r-md" />
                  )}

                  {/* Trash button appears on hover */}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('¿Seguro que deseas eliminar este chat?')) {
                          onDelete(conv.id)
                        }
                      }}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-rose-500 hover:text-white hover:scale-105"
                      title="Eliminar chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="w-full flex flex-col text-left pl-2">
                    <div className="flex w-full justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-semibold text-sm truncate ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                          {contact?.name || contact?.phone_number || 'Desconocido'}
                        </span>
                        {conv.is_ai_active && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-500" title="IA activa">
                            <Bot className="w-3 h-3" aria-label="IA activa" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
                        {conv.last_message_at && (
                          <span className={`text-[10px] whitespace-nowrap font-medium ${isActive ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-slate-400'}`}>
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: es })}
                          </span>
                        )}
                        {showAssignedAgent && conv.assigned_user && (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap truncate max-w-[80px]">
                            @{conv.assigned_user.full_name?.split(' ')[0] || 'Agente'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-3 mt-0.5">
                      <span className={`text-xs truncate flex-1 ${isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500'}`}>
                        {conv.last_message_preview || 'Sin mensajes'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0 animate-wz-pop">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
