'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgProfile {
  id: string
  name: string
  slug: string
  timezone: string
  logo_url: string | null
}

export interface AccountProfile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: string
}

export interface SubscriptionStatus {
  status: string
  plan_name: string
  trial_end: string | null
  days_left: number
  support_whatsapp: string
  support_message: string
  org_id: string
}

export interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

// ─── Organization Profile ─────────────────────────────────────────────────────

export async function getOrgProfileAction(): Promise<ActionResult<OrgProfile>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  const { data: profileData } = await supabase
    .from('users')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.active_organization_id) return err('Organización no encontrada')

  const { data: orgData, error } = await supabase
    .from('organizations')
    .select('id, name, slug, timezone, logo_url')
    .eq('id', profile.active_organization_id)
    .single()

  if (error || !orgData) return err('Error al obtener el perfil de la organización')
  return ok(orgData as OrgProfile)
}

export async function updateOrgProfileAction(
  updates: Partial<{ name: string; timezone: string; logo_url: string }>
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  const { data: profileData } = await supabase
    .from('users')
    .select('active_organization_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.active_organization_id) return err('Organización no encontrada')
  if (!['admin', 'owner', 'superadmin'].includes(profile.role)) {
    return err('No tienes permiso para editar el perfil de la organización')
  }

  const { error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', profile.active_organization_id)

  if (error) return err('Error al actualizar el perfil de la organización')
  return ok(undefined)
}

// ─── Account Profile ──────────────────────────────────────────────────────────

export async function getAccountProfileAction(): Promise<ActionResult<AccountProfile>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  if (error || !data) return err('Error al obtener tu perfil')

  const u = data as any
  return ok({
    id: user.id,
    full_name: u.full_name ?? user.user_metadata?.full_name ?? '',
    email: user.email ?? '',
    avatar_url: user.user_metadata?.avatar_url ?? null,
    role: u.role ?? 'agent',
  })
}

export async function updateAccountAction(updates: {
  full_name?: string
}): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  if (updates.full_name) {
    const { error } = await supabase
      .from('users')
      .update({ full_name: updates.full_name })
      .eq('id', user.id)

    if (error) return err('Error al actualizar tu nombre')

    await supabase.auth.updateUser({ data: { full_name: updates.full_name } })
  }

  return ok(undefined)
}

export async function updatePasswordAction(
  newPassword: string
): Promise<ActionResult<void>> {
  if (newPassword.length < 8) {
    return err('La contraseña debe tener al menos 8 caracteres')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return err('Error al cambiar la contraseña')
  return ok(undefined)
}

// ─── Subscription Status ──────────────────────────────────────────────────────

export async function getSubscriptionStatusAction(): Promise<ActionResult<SubscriptionStatus>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  const { data: profileData } = await supabase
    .from('users')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.active_organization_id) return err('Organización no encontrada')

  const orgId = profile.active_organization_id

  // Get subscription
  const { data: subData } = await (supabase as any)
    .from('subscriptions')
    .select('status, trial_end, plans(name)')
    .eq('org_id', orgId)
    .single()

  // Get support contact settings
  const { data: settingsData } = await (supabase as any)
    .from('platform_settings')
    .select('value')
    .eq('key', 'support_contact')
    .single()

  const defaultSupport = {
    whatsapp_number: '573012929983',
    message_template: 'Hola, me gustaría solicitar la clave de licencia para mi cuenta WazzAI. Mi ID de Organización es: ' + orgId,
  }

  const support = settingsData?.value || defaultSupport
  const message = (support.message_template || defaultSupport.message_template)
    .replace('{{org_id}}', orgId)

  const trialEnd = subData?.trial_end ?? null
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return ok({
    status: subData?.status ?? 'trialing',
    plan_name: (subData as any)?.plans?.name ?? 'Trial',
    trial_end: trialEnd,
    days_left: daysLeft,
    support_whatsapp: support.whatsapp_number || defaultSupport.whatsapp_number,
    support_message: message,
    org_id: orgId,
  })
}

// ─── Team Members ─────────────────────────────────────────────────────────────

export async function getTeamMembersAction(): Promise<ActionResult<TeamMember[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  const { data: profileData } = await supabase
    .from('users')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.active_organization_id) return err('Organización no encontrada')

  // Get members via org_memberships or users table
  const { data: members, error } = await supabase
    .from('users')
    .select('id, full_name, role, created_at')
    .eq('active_organization_id', profile.active_organization_id)
    .order('created_at', { ascending: true })

  if (error) return err('Error al obtener el equipo')

  // Get emails from auth via admin client
  const admin = createAdminClient()
  const { data: authData } = await (admin as any).auth.admin.listUsers()
  const authUsers: Record<string, string> = {}
  if (authData?.users) {
    for (const u of authData.users) {
      authUsers[u.id] = u.email ?? ''
    }
  }

  const rows: TeamMember[] = ((members as any[]) || []).map((m: any) => ({
    id: m.id,
    full_name: m.full_name ?? 'Sin nombre',
    email: authUsers[m.id] ?? '',
    role: m.role ?? 'agent',
    created_at: m.created_at,
  }))

  return ok(rows)
}
