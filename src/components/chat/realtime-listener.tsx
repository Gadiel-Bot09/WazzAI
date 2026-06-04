'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

interface RealtimeListenerProps {
  orgId: string
  currentUser?: any
}

// Custom event dispatched when a new message arrives — ChatWindow listens to this
export const REALTIME_NEW_MESSAGE_EVENT = 'wazzai:new_message'

export function RealtimeListener({ orgId, currentUser }: RealtimeListenerProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) return

    // Request Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // I1-FIX: On new message — dispatch custom event for ChatWindow + refresh conversation list
    const messagesChannel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          const newMsg = payload.new as any
          const conversationId = newMsg?.conversation_id
          if (conversationId) {
            window.dispatchEvent(
              new CustomEvent(REALTIME_NEW_MESSAGE_EVENT, { detail: { conversationId } })
            )
          }

          // Browser Notification for new incoming messages from contacts
          if (newMsg?.sender_type === 'contact' && 'Notification' in window && Notification.permission === 'granted') {
            if (document.hidden) {
              const notif = new Notification('Nuevo mensaje en WazzAI', {
                body: newMsg.content || 'Mensaje multimedia',
                icon: '/icon-192x192.png'
              })
              notif.onclick = () => {
                window.focus()
                notif.close()
              }
            }
          }

          // Also refresh server components
          router.refresh()
        }
      )
      .subscribe()

    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newConv = payload.new as any
            const oldConv = payload.old as any
          
          // Check for handoff to human or assignment
          if (newConv.status === 'pending' && oldConv.status !== 'pending' && currentUser) {
            const isForMe = currentUser.role === 'admin' || !newConv.department_id || newConv.department_id === currentUser.departmentId || newConv.assigned_to === currentUser.id
            if (isForMe) {
              toast.info('Un bot ha transferido un chat para atención humana', {
                description: 'Revisa tu Bandeja de Entrada',
                duration: 8000,
              })
              
              if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                const notif = new Notification('Chat transferido a humano', {
                  body: 'Un bot ha transferido un chat que requiere tu atención.',
                  icon: '/icon-192x192.png'
                })
                notif.onclick = () => {
                  window.focus()
                  notif.close()
                }
              }
            }
          }
          }
          
          router.refresh()
        }
      )
      .subscribe()

    const leadsChannel = supabase
      .channel('leads_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `org_id=eq.${orgId}` },
        () => { router.refresh() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(conversationsChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [orgId, router, supabase])

  return null
}
