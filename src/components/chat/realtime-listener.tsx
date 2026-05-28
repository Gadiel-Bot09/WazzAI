'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface RealtimeListenerProps {
  orgId: string
}

export function RealtimeListener({ orgId }: RealtimeListenerProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) return

    // Suscribirse a cambios en la tabla messages
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
          console.log('New message received:', payload)
          // Refrescar los datos actuales (Server Components)
          router.refresh()
        }
      )
      .subscribe()

    // Suscribirse a cambios en la tabla conversations
    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          console.log('Conversation updated:', payload)
          router.refresh()
        }
      )
      .subscribe()

    // Suscribirse a cambios en la tabla leads
    const leadsChannel = supabase
      .channel('leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          console.log('Lead updated:', payload)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(conversationsChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [orgId, router, supabase])

  // Componente invisible, solo maneja lógica
  return null
}
