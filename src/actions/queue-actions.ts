'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { EvolutionClient } from '@/lib/evolution/client'
// Removed unused import

// Helper to send a system text message
async function sendSystemMessage(
  adminClient: any, 
  conversationId: string, 
  orgId: string, 
  instanceId: string, 
  phone: string, 
  text: string
) {
  // Insert to DB
  await adminClient.from('messages').insert({
    conversation_id: conversationId,
    org_id: orgId,
    direction: 'outbound',
    message_type: 'text',
    content: text,
    status: 'sent'
  })
  
  // Get instance webhook secret
  const { data: instance } = await adminClient.from('whatsapp_instances').select('*').eq('id', instanceId).single()
  if (!instance) return

  // Send via Evolution API
  const evolution = new EvolutionClient()

  try {
    await evolution.sendTextMessage(instance.name, phone, text)
  } catch (error) {
    console.error('[QueueActions] Error sending system message:', error)
  }
}

/**
 * Tries to find an available agent for a given department.
 * Available agent: status='online' AND count(open assigned conversations) < max_active_chats
 */
async function findAvailableAgent(adminClient: any, orgId: string, departmentId: string | null) {
  // Query to find available agents
  // In Supabase we can do this with a raw RPC or a complex query. 
  // Let's do a join query on team_members and conversations
  let query = adminClient
    .from('team_members')
    .select('user_id, max_active_chats, users!inner(full_name)')
    .eq('org_id', orgId)
    .eq('status', 'online')
    .eq('role', 'agent') // Admins can be excluded from auto-assign, or we can include them if we want. Let's allow any role for now. Actually, let's include 'admin' too.

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }

  const { data: onlineAgents, error } = await query

  if (error || !onlineAgents || onlineAgents.length === 0) {
    return null
  }

  // Check their current workload
  for (const agent of onlineAgents) {
    const { count, error: countError } = await adminClient
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', agent.user_id)
      .eq('status', 'open')

    if (!countError && (count || 0) < agent.max_active_chats) {
      return {
        userId: agent.user_id,
        name: agent.users?.full_name || 'Agente'
      }
    }
  }

  return null // No one available
}

/**
 * Triggers the process to assign an available agent to a pending conversation.
 * Run this when a new handoff happens.
 */
export async function tryAssignConversation(conversationId: string, orgId: string, departmentId: string | null, instanceId: string, phone: string) {
  // Need service role client to bypass RLS for queue management
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const agent = await findAvailableAgent(adminClient, orgId, departmentId)

  if (agent) {
    // Assign it
    await adminClient.from('conversations').update({
      assigned_to: agent.userId,
      status: 'open',
      is_ai_active: false
    }).eq('id', conversationId)

    await sendSystemMessage(adminClient, conversationId, orgId, instanceId, phone, `Serás atendido por nuestro agente ${agent.name}.`)
    return true
  } else {
    // Queue it
    await adminClient.from('conversations').update({
      status: 'pending',
      is_ai_active: false
    }).eq('id', conversationId)

    await sendSystemMessage(adminClient, conversationId, orgId, instanceId, phone, `Todos nuestros agentes están ocupados en este momento. Estás en cola de espera y te atenderemos a la brevedad.`)
    return false
  }
}

/**
 * Checks the queue and assigns the oldest pending conversation to the first available agent.
 * Run this when an agent closes a chat or goes online.
 */
export async function processQueue(orgId: string, departmentId: string | null = null) {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find oldest pending chat
  let query = adminClient
    .from('conversations')
    .select('id, instance_id, contact_id, department_id, contacts!inner(phone_number)')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }

  const { data: pendingChats } = await query

  if (!pendingChats || pendingChats.length === 0) return

  const chatToAssign = pendingChats[0]
  const phone = (chatToAssign.contacts as any).phone_number

  // Try to assign
  const agent = await findAvailableAgent(adminClient, orgId, chatToAssign.department_id)

  if (agent) {
    await adminClient.from('conversations').update({
      assigned_to: agent.userId,
      status: 'open',
      is_ai_active: false
    }).eq('id', chatToAssign.id)

    await sendSystemMessage(
      adminClient, 
      chatToAssign.id, 
      orgId, 
      chatToAssign.instance_id, 
      phone, 
      `¡Gracias por tu paciencia! El agente ${agent.name} te atenderá ahora.`
    )
  }
}

/**
 * Updates the current agent's status.
 * If status changes to 'online', triggers processQueue.
 */
export async function updateAgentStatusAction(newStatus: 'online' | 'offline' | 'busy') {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autorizado' }

  // Get org_id
  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) return { success: false, error: 'Organización no encontrada' }

  // Update status in team_members
  const { error } = await supabase
    .from('team_members')
    .update({ status: newStatus })
    .eq('user_id', user.id)
    .eq('org_id', profile.org_id)

  if (error) {
    console.error('Error updating status:', error)
    return { success: false, error: 'Error al actualizar el estado' }
  }

  // If going online, process queue to see if there's any chat waiting for this agent
  if (newStatus === 'online') {
    const { data: teamData } = await supabase
      .from('team_members')
      .select('department_id')
      .eq('user_id', user.id)
      .eq('org_id', profile.org_id)
      .single()
      
    const teamMember = teamData as any
    // Call process queue in the background (no await needed for UI response)
    processQueue(profile.org_id, teamMember?.department_id || null).catch(console.error)
  }

  return { success: true }
}
