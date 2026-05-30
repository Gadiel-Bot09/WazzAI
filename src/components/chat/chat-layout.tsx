'use client'

import { useState, useEffect } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { deleteConversationAction } from '@/actions/conversation-actions'
import { toast } from 'sonner'

interface ChatLayoutProps {
  initialConversations: any[]
  showAssignedAgent: boolean
}

export function ChatLayout({ initialConversations, showAssignedAgent }: ChatLayoutProps) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  )

  useEffect(() => {
    setConversations(initialConversations)
  }, [initialConversations])

  const activeConversation = conversations.find(c => c.id === activeId)

  const handleDelete = async (id: string) => {
    // Optimistic UI update
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
    
    const res = await deleteConversationAction(id)
    if (!res.success) {
      toast.error(res.error || 'Error al eliminar chat')
      // If error, we might want to revert, but revalidation will fix it soon
    } else {
      toast.success('Chat eliminado')
    }
  }

  return (
    <div className="flex w-full h-full">
      {/* Sidebar - Lista de Conversaciones */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r bg-white dark:bg-background ${activeId ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
        <div className="p-4 border-b h-16 flex items-center justify-between shadow-sm z-10">
          <h2 className="font-semibold text-lg">Chats</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList 
            conversations={conversations} 
            activeId={activeId} 
            onSelect={setActiveId} 
            onDelete={handleDelete}
            showAssignedAgent={showAssignedAgent}
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
