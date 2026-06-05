'use client'

import { useState, useEffect } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { deleteConversationAction } from '@/actions/conversation-actions'
import { toast } from 'sonner'
import { REALTIME_NEW_MESSAGE_EVENT } from './realtime-listener'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChatLayoutProps {
  initialConversations: any[]
  showAssignedAgent: boolean
  currentUser: any
}

export function ChatLayout({ initialConversations, showAssignedAgent, currentUser }: ChatLayoutProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeTab, setActiveTab] = useState('ai')  // Default: IA tab (flows land here)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sync when server refreshes
  useEffect(() => {
    setConversations(initialConversations)
  }, [initialConversations])

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

  const getList = (tab: string) => {
    if (tab === 'mine') return myConversations
    if (tab === 'inbox') return inboxConversations
    if (tab === 'ai') return aiConversations
    if (tab === 'closed') return closedConversations
    return []
  }

  const filteredList = getList(activeTab)
  const activeConversation = conversations.find(c => c.id === activeId)

  // When a handoff happens (conversation moves from AI → Inbox), auto-switch tab
  useEffect(() => {
    function onNewMessage() {
      if (activeTab === 'ai' && activeId) {
        const stillInAi = aiConversations.find(c => c.id === activeId)
        if (!stillInAi) {
          // Active conversation left the AI tab → it's now in Inbox (handoff)
          setActiveTab('inbox')
        }
      }
    }
    window.addEventListener(REALTIME_NEW_MESSAGE_EVENT, onNewMessage)
    return () => window.removeEventListener(REALTIME_NEW_MESSAGE_EVENT, onNewMessage)
  }, [activeTab, activeId, aiConversations])

  // Auto-select first conversation on tab change or when list updates
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
                  <span className="bg-primary text-white rounded-full px-1 text-[10px] leading-4">
                    {myConversations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="inbox" className="text-xs gap-1">
                Bandeja
                {inboxConversations.length > 0 && (
                  <span className="bg-orange-500 text-white rounded-full px-1 text-[10px] leading-4">
                    {inboxConversations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1">
                IA
                {aiConversations.length > 0 && (
                  <span className="bg-emerald-500 text-white rounded-full px-1 text-[10px] leading-4">
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
