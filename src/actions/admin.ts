'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminOrgRow {
  id: string
  name: string
  slug: string
  is_active: boolean
  is_suspended: boolean
  suspension_reason: string | null
  created_at: string
  plan_name: string | null
  subscription_status: string | null
  user_count: number
  message_count: number
}

export interface AdminPlanRow {
  id: string
  name: string
  display_name: string
  price_monthly: number
  price_yearly: number
  is_active: boolean
  trial_days: number
  sort_order: number
  limits: Record<string, number>
  features: string[]
  created_at: string
}

export interface PlatformStats {
  total_orgs: number
  active_orgs: number
  suspended_orgs: number
  total_users: number
  total_messages: number
  total_conversations: number
  revenue_mrr: number
}

// ─── Guard: only platform super-admins ───────────────────────────────────────
// In production you'd check a `is_platform_admin` flag in a separate table.
// For now we use the service role client (only server-side) as the guard.

function getAdmin() {
  return createAdminClient()
}

// ─── Platform Stats ───────────────────────────────────────────────────────────

export async function getPlatformStatsAction(): Promise<ActionResult<PlatformStats>> {
  const admin = getAdmin()

  const [orgsRes, usersRes, msgsRes, convsRes, subsRes] = await Promise.all([
    (admin as any).from('organizations').select('id, is_active, is_suspended', { count: 'exact' }),
    (admin as any).from('users').select('id', { count: 'exact', head: true }),
    (admin as any).from('messages').select('id', { count: 'exact', head: true }),
    (admin as any).from('conversations').select('id', { count: 'exact', head: true }),
    (admin as any).from('subscriptions')
      .select('status, plans(price_monthly)')
      .eq('status', 'active'),
  ])

  const orgs = (orgsRes.data as any[]) || []
  const mrr = ((subsRes.data as any[]) || []).reduce(
    (sum: number, s: any) => sum + (s.plans?.price_monthly ?? 0),
    0
  )

  return ok({
    total_orgs: orgsRes.count ?? orgs.length,
    active_orgs: orgs.filter((o: any) => o.is_active && !o.is_suspended).length,
    suspended_orgs: orgs.filter((o: any) => o.is_suspended).length,
    total_users: usersRes.count ?? 0,
    total_messages: msgsRes.count ?? 0,
    total_conversations: convsRes.count ?? 0,
    revenue_mrr: mrr,
  })
}

// ─── Organization Management ──────────────────────────────────────────────────

export async function getAllOrgsAction(): Promise<ActionResult<AdminOrgRow[]>> {
  const admin = getAdmin()

  const { data, error } = await (admin as any)
    .from('organizations')
    .select(`
      id, name, slug, is_active, is_suspended, suspension_reason, created_at,
      subscriptions(status, plans(name)),
      users(count),
      messages(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAllOrgsAction:', error)
    return err('Error al obtener las organizaciones')
  }

  const rows: AdminOrgRow[] = ((data as any[]) || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    is_active: org.is_active,
    is_suspended: org.is_suspended,
    suspension_reason: org.suspension_reason,
    created_at: org.created_at,
    plan_name: org.subscriptions?.[0]?.plans?.name ?? null,
    subscription_status: org.subscriptions?.[0]?.status ?? null,
    user_count: org.users?.[0]?.count ?? 0,
    message_count: org.messages?.[0]?.count ?? 0,
  }))

  return ok(rows)
}

export async function suspendOrgAction(
  orgId: string,
  reason: string
): Promise<ActionResult<void>> {
  const admin = getAdmin()
  const { error } = await (admin as any)
    .from('organizations')
    .update({
      is_suspended: true,
      suspension_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) return err('Error al suspender la organización')
  return ok(undefined)
}

export async function reactivateOrgAction(orgId: string): Promise<ActionResult<void>> {
  const admin = getAdmin()
  const { error } = await (admin as any)
    .from('organizations')
    .update({
      is_suspended: false,
      suspension_reason: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) return err('Error al reactivar la organización')
  return ok(undefined)
}

// ─── Plan Management ──────────────────────────────────────────────────────────

export async function getAllPlansAction(): Promise<ActionResult<AdminPlanRow[]>> {
  const admin = getAdmin()
  const { data, error } = await (admin as any)
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return err('Error al obtener los planes')
  return ok((data as any[]) || [])
}

export async function updatePlanAction(
  planId: string,
  updates: Partial<{
    display_name: string
    price_monthly: number
    price_yearly: number
    is_active: boolean
    trial_days: number
    limits: Record<string, number>
    features: string[]
  }>
): Promise<ActionResult<void>> {
  const admin = getAdmin()
  const { error } = await (admin as any)
    .from('plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (error) return err('Error al actualizar el plan')
  return ok(undefined)
}

export async function createPlanAction(plan: {
  name: string
  display_name: string
  price_monthly: number
  price_yearly: number
  trial_days: number
  sort_order: number
  limits: Record<string, number>
  features: string[]
}): Promise<ActionResult<void>> {
  const admin = getAdmin()
  const { error } = await (admin as any).from('plans').insert(plan)
  if (error) return err('Error al crear el plan')
  return ok(undefined)
}

// ─── Assign plan to org ───────────────────────────────────────────────────────

export async function assignPlanToOrgAction(
  orgId: string,
  planId: string
): Promise<ActionResult<void>> {
  const admin = getAdmin()

  const { data: existing } = await (admin as any)
    .from('subscriptions')
    .select('id')
    .eq('org_id', orgId)
    .single()

  if ((existing as any)?.id) {
    const { error } = await (admin as any)
      .from('subscriptions')
      .update({ plan_id: planId, status: 'active', updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
    if (error) return err('Error al actualizar el plan de la organización')
  } else {
    const { error } = await (admin as any)
      .from('subscriptions')
      .insert({
        org_id: orgId,
        plan_id: planId,
        status: 'active',
        billing_cycle: 'monthly',
      })
    if (error) return err('Error al asignar el plan')
  }

  // Also update org's plan_id reference
  await (admin as any)
    .from('organizations')
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq('id', orgId)

  return ok(undefined)
}

// ─── Manual Subscription Management ───────────────────────────────────────────

export async function activateSubscriptionAction(orgId: string): Promise<ActionResult<void>> {
  const admin = getAdmin()
  const { error } = await (admin as any)
    .from('subscriptions')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString() 
    })
    .eq('org_id', orgId)

  if (error) {
    console.error('activateSubscriptionAction:', error)
    return err('Error al activar la licencia de la organización')
  }
  return ok(undefined)
}

export async function getPlatformSettingsAction(): Promise<ActionResult<any>> {
  const admin = getAdmin()
  const { data, error } = await (admin as any)
    .from('platform_settings')
    .select('key, value')

  if (error) {
    // If the table doesn't exist yet, we just return empty
    return ok([])
  }
  return ok(data || [])
}

export async function updatePlatformSettingsAction(key: string, value: any): Promise<ActionResult<void>> {
  const admin = getAdmin()
  
  // Try to update or insert
  const { error } = await (admin as any)
    .from('platform_settings')
    .upsert({ 
      key, 
      value, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'key' })

  if (error) {
    console.error('updatePlatformSettingsAction:', error)
    return err('Error al guardar la configuración de la plataforma')
  }
  return ok(undefined)
}

