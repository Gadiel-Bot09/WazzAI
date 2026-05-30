'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { evolutionClient } from '@/lib/evolution/client'
import { revalidatePath } from 'next/cache'

async function getUserAndOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('org_id, full_name').eq('id', user.id).single()
  const p = profile as any
  return { user, orgId: p?.org_id as string | null, fullName: p?.full_name as string | null }
}

// ─── CLOSE CONVERSATION ───────────────────────────────────────────────────────

export async function closeConversationAction(
  conversationId: string,
  sendSurvey: boolean = true
): Promise<ActionResult<void>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()

  // 1. Get conversation details (contact phone, instance)
  const { data: conv } = await (admin as any)
    .from('conversations')
    .select('contact_id, instance_id, org_id, status')
    .eq('id', conversationId)
    .single()

  if (!conv) return err('Conversación no encontrada')
  if (conv.status === 'closed') return err('La conversación ya está cerrada')

  // 2. Close the conversation
  await (admin as any)
    .from('conversations')
    .update({ status: 'closed', closed_at: new Date().toISOString(), is_ai_active: false })
    .eq('id', conversationId)

  // 2.5 End any active flow states for this contact so they don't resume on the next message
  await (admin as any)
    .from('flow_states')
    .update({ status: 'completed' })
    .eq('contact_id', conv.contact_id)
    .eq('status', 'active')

  // 3. Send satisfaction survey if requested
  if (sendSurvey) {
    const { data: contact } = await (admin as any)
      .from('contacts')
      .select('phone_number')
      .eq('id', conv.contact_id)
      .single()

    if (contact?.phone_number) {
      const surveyMsg =
        '¡Gracias por contactarnos! 😊 Tu opinión es muy importante.\n\n' +
        '¿Cómo calificarías nuestra atención?\n\n' +
        '1️⃣ Muy malo\n2️⃣ Malo\n3️⃣ Regular\n4️⃣ Bueno\n5️⃣ Excelente\n\n' +
        'Responde con el número de tu calificación (1-5).'

      try {
        await evolutionClient.sendTextMessage(conv.instance_id, contact.phone_number, surveyMsg)
      } catch (e) {
        console.error('closeConversationAction: failed to send survey', e)
      }

      // Insert survey record
      await (admin as any)
        .from('satisfaction_surveys')
        .insert({
          org_id: ctx.orgId,
          conversation_id: conversationId,
          contact_id: conv.contact_id,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
    }
  }

  revalidatePath('/dashboard/chat')
  return ok(undefined)
}

// ─── REOPEN CONVERSATION ──────────────────────────────────────────────────────

export async function reopenConversationAction(
  conversationId: string
): Promise<ActionResult<void>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  await (admin as any)
    .from('conversations')
    .update({ status: 'open', closed_at: null })
    .eq('id', conversationId)

  revalidatePath('/dashboard/chat')
  return ok(undefined)
}

// ─── TRANSFER CONVERSATION ────────────────────────────────────────────────────

export async function transferConversationAction(
  conversationId: string,
  toUserId: string
): Promise<ActionResult<void>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()

  // Verify target user belongs to same org
  const { data: targetUser } = await (admin as any)
    .from('users')
    .select('id, full_name, org_id')
    .eq('id', toUserId)
    .eq('org_id', ctx.orgId)
    .single()

  if (!targetUser) return err('Usuario destino no encontrado en esta organización')

  await (admin as any)
    .from('conversations')
    .update({ assigned_to: toUserId })
    .eq('id', conversationId)

  revalidatePath('/dashboard/chat')
  return ok(undefined)
}

// ─── GET ORG USERS ────────────────────────────────────────────────────────────
// ─── GET TRANSFER TARGETS ─────────────────────────────────────────────────────

export async function getTransferTargetsAction(): Promise<ActionResult<{ departments: any[], members: any[] }>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')
  const admin = createAdminClient()
  
  const [deptsRes, membersRes] = await Promise.all([
    admin.from('departments').select('*').eq('org_id', ctx.orgId).order('name'),
    admin.from('team_members').select('*, users:user_id(full_name, email)').eq('org_id', ctx.orgId)
  ])

  if (deptsRes.error) return err(deptsRes.error.message)
  if (membersRes.error) return err(membersRes.error.message)

  return ok({ departments: deptsRes.data || [], members: membersRes.data || [] })
}

// ─── SCHEDULE REMINDER ────────────────────────────────────────────────────────

export async function scheduleReminderAction(
  conversationId: string,
  message: string,
  remindAt: string   // ISO datetime
): Promise<ActionResult<void>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  if (!message.trim()) return err('El mensaje del recordatorio no puede estar vacío')
  if (!remindAt) return err('Debes seleccionar una fecha y hora')

  const remindDate = new Date(remindAt)
  if (remindDate <= new Date()) return err('La fecha debe ser en el futuro')

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('reminders')
    .insert({
      org_id: ctx.orgId,
      conversation_id: conversationId,
      created_by: ctx.user.id,
      message: message.trim(),
      remind_at: remindDate.toISOString(),
      status: 'pending',
    })

  if (error) {
    console.error('scheduleReminderAction error:', error)
    return err('Error al programar el recordatorio')
  }

  return ok(undefined)
}

// ─── GET SURVEY REPORT ────────────────────────────────────────────────────────

export async function getSurveyReportAction(opts: {
  from?: string
  to?: string
  page?: number
  pageSize?: number
} = {}): Promise<ActionResult<{
  surveys: any[]
  total: number
  avgScore: number | null
  responseRate: number
  distribution: Record<number, number>
}>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { page = 1, pageSize = 25 } = opts
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = (admin as any)
    .from('satisfaction_surveys')
    .select(`
      *,
      contact:contacts(name, phone_number),
      conversation:conversations(id, last_message_preview)
    `, { count: 'exact' })
    .eq('org_id', ctx.orgId)
    .order('sent_at', { ascending: false })
    .range(from, to)

  if (opts.from) query = query.gte('sent_at', opts.from)
  if (opts.to) query = query.lte('sent_at', opts.to)

  const { data, error, count } = await query

  if (error) {
    console.error('getSurveyReportAction error:', error)
    return err('Error al obtener el reporte de encuestas')
  }

  const surveys = (data ?? []) as any[]
  const responded = surveys.filter((s: any) => s.score !== null)
  const avgScore = responded.length > 0
    ? responded.reduce((sum: number, s: any) => sum + s.score, 0) / responded.length
    : null
  const responseRate = surveys.length > 0
    ? Math.round((responded.length / surveys.length) * 100)
    : 0

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const s of responded) {
    if (s.score >= 1 && s.score <= 5) distribution[s.score]++
  }

  return ok({ surveys, total: count ?? 0, avgScore, responseRate, distribution })
}

// ── TAKEOVER ────────────────────────────────────────────────────────────────

export async function takeoverConversationAction(conversationId: string, assignedToUserId: string) {
  try {
    const admin = createAdminClient() as any

    // 1. Mark conversation as assigned and turn off AI
    const { data, error } = await admin
      .from('conversations')
      .update({
        is_ai_active: false,
        assigned_to: assignedToUserId,
        status: 'open'
      })
      .eq('id', conversationId)
      .select('*, contact:contacts(*)')
      .single()

    if (error) return err(error.message)

    // 2. End any active flows for this contact so the AI doesn't resume
    await admin
      .from('flow_states')
      .update({ status: 'completed' })
      .eq('contact_id', (data as any).contact_id)
      .eq('status', 'active')

    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function reassignConversationAction(conversationId: string, departmentId: string | null, assignedToUserId: string | null) {
  try {
    const admin = createAdminClient() as any

    const payload: any = {}
    if (departmentId !== undefined) payload.department_id = departmentId
    if (assignedToUserId !== undefined) payload.assigned_to = assignedToUserId

    const { data, error } = await admin
      .from('conversations')
      .update(payload)
      .eq('id', conversationId)
      .select('*, contact:contacts(*)')
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}



// ─── DELETE CONVERSATION ──────────────────────────────────────────────────────

export async function deleteConversationAction(
  conversationId: string
): Promise<ActionResult<void>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  
  // Verify ownership
  const { data: conv } = await (admin as any)
    .from('conversations')
    .select('org_id')
    .eq('id', conversationId)
    .single()

  if (!conv || conv.org_id !== ctx.orgId) {
    return err('Conversación no encontrada')
  }

  const { error } = await (admin as any)
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    console.error('deleteConversationAction error:', error)
    return err('Error al eliminar la conversación')
  }

  revalidatePath('/dashboard/chat')
  return ok(undefined)
}
