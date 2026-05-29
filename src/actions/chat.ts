'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { evolutionClient } from '@/lib/evolution/client'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getConversationsAction(): Promise<ActionResult<any[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) return err('Organización no encontrada')

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      is_ai_active,
      last_message_at,
      last_message_preview,
      unread_count,
      status,
      contact:contacts(*)
    `)
    .eq('org_id', profile.org_id)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('getConversationsAction error:', error)
    return err('Error al obtener conversaciones')
  }

  return ok(conversations)
}

export async function getMessagesAction(conversationId: string): Promise<ActionResult<any[]>> {
  const supabase = await createClient()
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })

  if (error) {
    console.error('getMessagesAction error:', error)
    return err('Error al obtener mensajes')
  }

  return ok(messages)
}

export async function sendChatMessageAction(
  conversationId: string, 
  text: string
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) return err('Organización no encontrada')

  const { data: convData } = await supabase
    .from('conversations')
    .select('contact_id, instance_id')
    .eq('id', conversationId)
    .single()
  
  const conv = convData as any

  if (!conv) return err('Conversación no encontrada')

  const { data: contactData } = await supabase
    .from('contacts')
    .select('phone_number')
    .eq('id', conv.contact_id)
    .single()
    
  const contact = contactData as any

  if (!contact?.phone_number) return err('Contacto no tiene número de teléfono')

  try {
    // 1. Send via Evolution API
    // En el futuro, idealmente usaríamos el instance_id para sacar el nombre de la instancia.
    // Por ahora, como es single-tenant per org en la prueba, usamos el org_id
    await evolutionClient.sendTextMessage(profile.org_id, contact.phone_number, text)

    // 2. Guardar el mensaje en Supabase
    const admin = createAdminClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('messages').insert({
      conversation_id: conversationId,
      org_id: profile.org_id,
      sender_id: user.id,
      direction: 'outbound',
      content: text,
      status: 'sent',
      message_type: 'text'
    })

    // 3. Actualizar conversación
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text.substring(0, 50)
    }).eq('id', conversationId)

    return ok(undefined)
  } catch (error) {
    console.error('sendChatMessageAction error:', error)
    return err('Error al enviar el mensaje')
  }
}
