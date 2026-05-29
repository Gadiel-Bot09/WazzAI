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
          // Notify active ChatWindow (if open) with the conversation_id
          const conversationId = (payload.new as any)?.conversation_id
          if (conversationId) {
            window.dispatchEvent(
              new CustomEvent(REALTIME_NEW_MESSAGE_EVENT, { detail: { conversationId } })
            )
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
