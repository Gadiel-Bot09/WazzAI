'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { evolutionClient } from '@/lib/evolution/client'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getConversationsAction(): Promise<ActionResult<{ conversations: any[]; showAssignedAgent: boolean }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) return err('Organización no encontrada')

  // Get Org Settings for show_assigned_agent
  const { data: orgData } = await (supabase as any).from('organizations').select('metadata').eq('id', profile.org_id).single()
  const meta = (orgData?.metadata as any) || {}
  const showAssignedAgent = !!meta.show_assigned_agent

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      is_ai_active,
      last_message_at,
      last_message_preview,
      unread_count,
      status,
      contact:contacts(*),
      assigned_to,
      assigned_user:users!conversations_assigned_to_fkey(full_name, avatar_url)
    `)
    .eq('org_id', profile.org_id)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('getConversationsAction error:', error)
    return err('Error al obtener conversaciones')
  }

  return ok({ conversations, showAssignedAgent })
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
    // Por ahora, como es single-tenant per org en la prueba, usamos
    const finalInstanceId = conv.instance_id || profile.org_id;
    await evolutionClient.sendTextMessage(finalInstanceId, contact.phone_number, text)

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

// ─── CANNED MESSAGES ──────────────────────────────────────────────────────────

export interface CannedMessage {
  id: string
  org_id: string
  created_by: string | null
  title: string
  shortcut: string | null
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getCannedMessagesAction(): Promise<ActionResult<CannedMessage[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const { data, error } = await supabase
    .from('canned_messages')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('title')

  if (error) return err('Error al obtener mensajes predefinidos')
  return ok((data ?? []) as CannedMessage[])
}

export async function createCannedMessageAction(data: {
  title: string
  content: string
  shortcut?: string
}): Promise<ActionResult<CannedMessage>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data: created, error } = await (admin as any)
    .from('canned_messages')
    .insert({
      org_id: orgId,
      created_by: user.id,
      title: data.title.trim(),
      content: data.content.trim(),
      shortcut: data.shortcut?.trim() || null,
    })
    .select('*')
    .single()

  if (error) return err('Error al crear mensaje predefinido')
  return ok(created as CannedMessage)
}

export async function updateCannedMessageAction(
  id: string,
  data: { title?: string; content?: string; shortcut?: string; is_active?: boolean }
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const admin = createAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) updates.title = data.title.trim()
  if (data.content !== undefined) updates.content = data.content.trim()
  if (data.shortcut !== undefined) updates.shortcut = data.shortcut.trim() || null
  if (data.is_active !== undefined) updates.is_active = data.is_active

  const { error } = await (admin as any)
    .from('canned_messages')
    .update(updates)
    .eq('id', id)

  if (error) return err('Error al actualizar mensaje predefinido')
  return ok(undefined)
}

export async function deleteCannedMessageAction(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const admin = createAdminClient()
  const { error } = await (admin as any).from('canned_messages').delete().eq('id', id)

  if (error) return err('Error al eliminar mensaje predefinido')
  return ok(undefined)
}

