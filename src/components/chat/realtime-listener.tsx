'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface RealtimeListenerProps {
  orgId: string
}

// Custom event dispatched when a new message arrives — ChatWindow listens to this
export const REALTIME_NEW_MESSAGE_EVENT = 'wazzai:new_message'

export function RealtimeListener({ orgId }: RealtimeListenerProps) {
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
            // Only show if the page is hidden or user is not looking at it, or maybe always show if it's not the active chat?
            // Since we don't have active chat ID here easily, we can check document visibility.
            if (document.hidden) {
              const notif = new Notification('Nuevo mensaje en WazzAI', {
                body: newMsg.content || 'Mensaje multimedia',
                icon: '/icon-192x192.png' // Or whatever icon
              })
              notif.onclick = () => {
                window.focus()
                notif.close()
              }
            }
          }

          // Also refresh server components (conversation list timestamps/previews)
          router.refresh()
        }
      )
      .subscribe()

    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        () => { router.refresh() }
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
