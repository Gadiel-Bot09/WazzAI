'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { subDays, startOfDay, endOfDay } from 'date-fns'

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profileData } = await supabase
    .from('users').select('active_organization_id').eq('id', user.id).single()
  return (profileData as any)?.active_organization_id ?? null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationMetrics {
  total_conversations: number
  open_conversations: number
  pending_conversations: number
  closed_conversations: number
  ai_resolved: number
  avg_resolution_time_min: number
  total_messages: number
  inbound_messages: number
  outbound_messages: number
  ai_messages: number
}

export interface DailyMessageSeries {
  message_date: string
  total: number
  inbound: number
  outbound: number
  ai: number
}

export interface LeadsByColumn {
  column_name: string
  color: string
  count: number
}

export interface TopContact {
  name: string
  phone_number: string
  message_count: number
  last_contact_at: string
}

// ─── Analytics Actions ────────────────────────────────────────────────────────

/**
 * Main conversation KPIs via the pre-built DB function
 */
export async function getConversationMetricsAction(
  daysBack = 30
): Promise<ActionResult<ConversationMetrics>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()
  const dateFrom = startOfDay(subDays(new Date(), daysBack)).toISOString()
  const dateTo = endOfDay(new Date()).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_conversation_metrics', {
    p_org_id: orgId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (error) {
    console.error('getConversationMetricsAction:', error)
    return err('Error al obtener las métricas')
  }

  const row = Array.isArray(data) ? data[0] : data
  return ok({
    total_conversations: Number(row?.total_conversations ?? 0),
    open_conversations: Number(row?.open_conversations ?? 0),
    pending_conversations: Number(row?.pending_conversations ?? 0),
    closed_conversations: Number(row?.closed_conversations ?? 0),
    ai_resolved: Number(row?.ai_resolved ?? 0),
    avg_resolution_time_min: Number(row?.avg_resolution_time_min ?? 0),
    total_messages: Number(row?.total_messages ?? 0),
    inbound_messages: Number(row?.inbound_messages ?? 0),
    outbound_messages: Number(row?.outbound_messages ?? 0),
    ai_messages: Number(row?.ai_messages ?? 0),
  })
}

/**
 * Daily message volume time-series for charts
 */
export async function getMessagesPerDayAction(
  daysBack = 30
): Promise<ActionResult<DailyMessageSeries[]>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_messages_per_day', {
    p_org_id: orgId,
    p_days_back: daysBack,
  })

  if (error) {
    console.error('getMessagesPerDayAction:', error)
    return err('Error al obtener la serie de mensajes')
  }

  return ok(
    ((data as any[]) || []).map(row => ({
      message_date: row.message_date,
      total: Number(row.total),
      inbound: Number(row.inbound),
      outbound: Number(row.outbound),
      ai: Number(row.ai),
    }))
  )
}

/**
 * Distribution of leads across Kanban columns
 */
export async function getLeadsByColumnAction(): Promise<ActionResult<LeadsByColumn[]>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('kanban_columns')
    .select(`
      name,
      color,
      leads(count)
    `)
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (error) {
    console.error('getLeadsByColumnAction:', error)
    return err('Error al obtener los leads por columna')
  }

  return ok(
    ((data as any[]) || []).map(col => ({
      column_name: col.name,
      color: col.color || '#6366f1',
      count: col.leads?.[0]?.count ?? 0,
    }))
  )
}

/**
 * Top contacts by message volume (most active)
 */
export async function getTopContactsAction(
  limit = 5
): Promise<ActionResult<TopContact[]>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('messages')
    .select(`
      conversation_id,
      conversations!inner(
        org_id,
        contact:contacts(name, phone_number, last_contact_at)
      )
    `)
    .eq('conversations.org_id', orgId)
    .eq('direction', 'inbound')

  if (error) {
    console.error('getTopContactsAction:', error)
    return err('Error al obtener los contactos principales')
  }

  // Aggregate by contact
  const contactMap = new Map<string, TopContact>()
  for (const msg of (data as any[]) || []) {
    const contact = msg.conversations?.contact
    if (!contact?.phone_number) continue
    const key = contact.phone_number
    if (!contactMap.has(key)) {
      contactMap.set(key, {
        name: contact.name || contact.phone_number,
        phone_number: contact.phone_number,
        message_count: 0,
        last_contact_at: contact.last_contact_at || '',
      })
    }
    contactMap.get(key)!.message_count++
  }

  const sorted = Array.from(contactMap.values())
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, limit)

  return ok(sorted)
}

/**
 * Quick summary stats for the last 7 vs previous 7 days (trend cards)
 */
export async function getWeeklyTrendAction(): Promise<ActionResult<{
  thisWeek: { messages: number; conversations: number }
  lastWeek: { messages: number; conversations: number }
}>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()

  const now = new Date()
  const w0Start = startOfDay(subDays(now, 7)).toISOString()
  const w1Start = startOfDay(subDays(now, 14)).toISOString()
  const today = endOfDay(now).toISOString()

  // This week messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [twMsg, lwMsg, twConv, lwConv] = await Promise.all([
    (supabase as any).from('messages').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).gte('sent_at', w0Start).lte('sent_at', today),
    (supabase as any).from('messages').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).gte('sent_at', w1Start).lt('sent_at', w0Start),
    (supabase as any).from('conversations').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).gte('created_at', w0Start).lte('created_at', today),
    (supabase as any).from('conversations').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).gte('created_at', w1Start).lt('created_at', w0Start),
  ])

  return ok({
    thisWeek: {
      messages: twMsg.count ?? 0,
      conversations: twConv.count ?? 0,
    },
    lastWeek: {
      messages: lwMsg.count ?? 0,
      conversations: lwConv.count ?? 0,
    },
  })
}
