'use client'

import { useState, useEffect } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { deleteConversationAction } from '@/actions/conversation-actions'
import { toast } from 'sonner'

interface ChatLayoutProps {
  initialConversations: any[]
  showAssignedAgent: boolean
  currentUser: any
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ChatLayout({ initialConversations, showAssignedAgent, currentUser }: ChatLayoutProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeTab, setActiveTab] = useState('mine')
  const [activeId, setActiveId] = useState<string | null>(null)

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

  // Filter logic
  const myConversations = conversations.filter(c => c.assigned_to === currentUser.id)
  
  const inboxConversations = conversations.filter(c => {
    const isAi = c.is_ai_active === true || c.status === 'ai'
    if (isAi) return false
    if (c.assigned_to && c.assigned_to !== currentUser.id) return false
    if (c.assigned_to === currentUser.id) return false // It's in 'mine'
    if (c.status === 'closed') return false
    
    // Department check
    if (isAdmin) return true
    if (!c.department_id) return true
    return c.department_id === currentUser.departmentId
  })

  const aiConversations = conversations.filter(c => c.is_ai_active === true || c.status === 'ai')

  const getFilteredConversations = () => {
    if (activeTab === 'mine') return myConversations
    if (activeTab === 'inbox') return inboxConversations
    if (activeTab === 'ai') return aiConversations
    return []
  }

  const filteredList = getFilteredConversations()
  const activeConversation = conversations.find(c => c.id === activeId)

  // Auto select first on tab change
  useEffect(() => {
    if (filteredList.length > 0 && !filteredList.find(c => c.id === activeId)) {
      setActiveId(filteredList[0].id)
    } else if (filteredList.length === 0) {
      setActiveId(null)
    }
  }, [activeTab]) // Intentionally not including filteredList to avoid changing activeId on every new message

  return (
    <div className="flex w-full h-full">
      {/* Sidebar - Lista de Conversaciones */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r bg-white dark:bg-background ${activeId ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
        <div className="p-4 border-b h-[68px] flex flex-col justify-center shadow-sm z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="mine" className="text-xs">Mis Chats</TabsTrigger>
              <TabsTrigger value="inbox" className="text-xs">
                Bandeja {inboxConversations.length > 0 && `(${inboxConversations.length})`}
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">Chats IA</TabsTrigger>
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

      {/* Main - Ventana de Chat */}
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
