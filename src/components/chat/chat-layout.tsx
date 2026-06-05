'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { deleteConversationAction } from '@/actions/conversation-actions'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChatLayoutProps {
  initialConversations: any[]
  showAssignedAgent: boolean
  currentUser: any
  orgId: string
}

export function ChatLayout({ initialConversations, showAssignedAgent, currentUser, orgId }: ChatLayoutProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeTab, setActiveTab] = useState('ai')
  const [activeId, setActiveId] = useState<string | null>(null)
  const supabase = createClient()
  
  // Keep a ref of conversations for use inside realtime callbacks without stale closures
  const convsRef = useRef(conversations)
  convsRef.current = conversations

  // Sync when server sends fresh initial data (only on first mount)
  useEffect(() => {
    setConversations(initialConversations)
  }, []) // eslint-disable-line

  // ── Supabase Realtime: subscribe directly to conversation changes ──────────
  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel(`chat-layout-convs-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // New conversation created (e.g. by a flow/webhook)
            // We need to fetch the full conversation with contact info since realtime
            // payloads don't include joined data
            const { data: fullConv } = await supabase
              .from('conversations')
              .select(`
                id, is_ai_active, last_message_at, last_message_preview,
                unread_count, status, department_id, assigned_to,
                contact:contacts(*),
                assigned_user:users!conversations_assigned_to_fkey(full_name, avatar_url)
              `)
              .eq('id', (payload.new as any).id)
              .single()

            if (fullConv) {
              setConversations(prev => {
                // Avoid duplicates
                if (prev.find(c => c.id === fullConv.id)) return prev
                return [fullConv, ...prev]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any
            setConversations(prev =>
              prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)
                  .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())
            )

            // If the active conversation was just handed off (ai→pending), switch tab
            if (updated.is_ai_active === false && updated.status === 'pending') {
              toast.info('Chat transferido a bandeja de entrada', {
                description: 'Un flujo ha transferido el chat para atención humana.',
                duration: 5000,
              })
            }
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(c => c.id !== (payload.old as any).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId]) // eslint-disable-line

  const handleDelete = async (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
    const res = await deleteConversationAction(id)
    if (!res.success) toast.error(res.error || 'Error al eliminar chat')
    else toast.success('Chat eliminado')
  }

  const isAdmin = currentUser.role === 'admin'

  // ── Filter lists ─────────────────────────────────────────────────────────────
  const myConversations = conversations.filter(c =>
    c.assigned_to === currentUser.id && c.status !== 'closed'
  )

  const inboxConversations = conversations.filter(c => {
    if (c.status === 'closed') return false
    if (c.is_ai_active === true) return false
    if (c.assigned_to && c.assigned_to !== currentUser.id) return false
    if (c.assigned_to === currentUser.id) return false
    if (isAdmin) return true
    if (!c.department_id) return true
    return c.department_id === currentUser.departmentId
  })

  const aiConversations = conversations.filter(c =>
    c.is_ai_active === true && c.status !== 'closed'
  )

  const closedConversations = conversations.filter(c => c.status === 'closed')

  const getList = useCallback((tab: string) => {
    if (tab === 'mine') return myConversations
    if (tab === 'inbox') return inboxConversations
    if (tab === 'ai') return aiConversations
    if (tab === 'closed') return closedConversations
    return []
  }, [myConversations, inboxConversations, aiConversations, closedConversations])

  const filteredList = getList(activeTab)
  const activeConversation = conversations.find(c => c.id === activeId)

  // Auto-switch: when active conversation moves from AI tab → Inbox (handoff)
  useEffect(() => {
    if (activeTab === 'ai' && activeId) {
      const stillInAi = aiConversations.find(c => c.id === activeId)
      if (!stillInAi && inboxConversations.find(c => c.id === activeId)) {
        setActiveTab('inbox')
      }
    }
  }, [aiConversations, inboxConversations, activeId, activeTab])

  // Auto-select first conversation when tab changes or list updates
  useEffect(() => {
    const list = getList(activeTab)
    if (list.length > 0 && !list.find(c => c.id === activeId)) {
      setActiveId(list[0].id)
    } else if (list.length === 0) {
      setActiveId(null)
    }
  }, [activeTab, conversations]) // eslint-disable-line

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r bg-white dark:bg-background ${activeId ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
        <div className="p-4 border-b h-[68px] flex flex-col justify-center shadow-sm z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="mine" className="text-xs gap-1">
                Míos
                {myConversations.length > 0 && (
                  <span className="bg-primary text-white rounded-full px-1 text-[10px] leading-4 min-w-[16px] text-center">
                    {myConversations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="inbox" className="text-xs gap-1">
                Bandeja
                {inboxConversations.length > 0 && (
                  <span className="bg-orange-500 text-white rounded-full px-1 text-[10px] leading-4 min-w-[16px] text-center">
                    {inboxConversations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1">
                IA
                {aiConversations.length > 0 && (
                  <span className="bg-emerald-500 text-white rounded-full px-1 text-[10px] leading-4 min-w-[16px] text-center">
                    {aiConversations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="text-xs">Cerrados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={filteredList}
            activeId={activeId}
            onSelect={setActiveId}
            onDelete={handleDelete}
            showAssignedAgent={showAssignedAgent}
            currentUser={currentUser}
          />
        </div>
      </div>

      {/* Chat window */}
      <div className={`flex-1 flex-col h-full bg-[#f0f2f5] dark:bg-muted/10 ${!activeId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatWindow
            key={activeConversation.id}
            conversationId={activeConversation.id}
            contactName={activeConversation.contact?.name || activeConversation.contact?.phone_number || 'Desconocido'}
            contactPhone={activeConversation.contact?.phone_number || ''}
            isAIActive={activeConversation.is_ai_active ?? false}
            status={activeConversation.status}
            assignedUser={activeConversation.assigned_user}
            showAssignedAgent={showAssignedAgent}
            currentUser={currentUser}
          />
        ) : (
          <div className="flex h-full items-center justify-center flex-col text-muted-foreground p-8 text-center bg-slate-50 dark:bg-background">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">WhatsApp Inbox</h3>
            <p className="max-w-md">
              Selecciona una conversación del panel izquierdo para comenzar a chatear o espera a recibir nuevos mensajes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
