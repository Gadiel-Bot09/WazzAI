'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import { getBillingInfoAction } from './billing'

// Helper to get current org
async function getCurrentOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) throw new Error('Organización no encontrada')
  
  return profile.org_id
}

// ── DEPARTMENTS ─────────────────────────────────────────────────────────────

export async function getDepartmentsAction() {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('departments')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function createDepartmentAction(payload: { name: string, description?: string }) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any

    // Billing Check
    const billingRes = await getBillingInfoAction()
    if (billingRes.success && billingRes.data.limits) {
      const allowedDepts = billingRes.data.limits.departments || 5
      const { count } = await admin.from('departments').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      if (count !== null && count >= allowedDepts) {
        return err(`Has alcanzado el límite de ${allowedDepts} departamentos para tu plan actual.`)
      }
    }

    const { data, error } = await admin
      .from('departments')
      .insert({ org_id: orgId, ...payload })
      .select('*')
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function updateDepartmentAction(id: string, payload: { name: string, description?: string }) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('departments')
      .update(payload)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { error } = await admin
      .from('departments')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return err(error.message)
    return ok(null)
  } catch (e: any) {
    return err(e.message)
  }
}

// ── TEAM MEMBERS ────────────────────────────────────────────────────────────

export async function getTeamMembersAction() {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    // Fetch team members with their users and department
    const { data, error } = await admin
      .from('team_members')
      .select(`
        *,
        users (id, full_name, email, avatar_url),
        departments (id, name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function updateTeamMemberAction(id: string, payload: { role?: string, department_id?: string | null }) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('team_members')
      .update(payload)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function removeTeamMemberAction(id: string) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    // Note: this only removes them from the team, it doesn't delete their auth user or user record.
    const { error } = await admin
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return err(error.message)
    return ok(undefined)
  } catch (e: any) {
    return err(e.message)
  }
}

// Invite is more complex: typically involves auth.admin.inviteUserByEmail 
// and then creating a team_member record. For now we will just create a placeholder action
export async function inviteTeamMemberAction(email: string, role: string, department_id?: string) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    
    // Billing Check
    const billingRes = await getBillingInfoAction()
    if (billingRes.success && billingRes.data.limits) {
      const allowedAgents = billingRes.data.limits.operators || 1
      const { count } = await admin.from('team_members').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      if (count !== null && count >= allowedAgents) {
        return err(`Has alcanzado el límite de ${allowedAgents} agentes para tu plan actual.`)
      }
    }

    // 1. Check if user already exists
    const { data: existingUser } = await admin.from('users').select('id, email').eq('email', email).maybeSingle()
    
    let userId = existingUser?.id

    if (!userId) {
      // 2. If not, invite them via Supabase Auth Admin
      const { data: authData, error: authErr } = await admin.auth.admin.inviteUserByEmail(email)
      if (authErr) return err(authErr.message)
      userId = authData.user.id
      
      // Wait briefly for trigger to create user (if you have one), otherwise we might need to insert it manually
      // Assuming you have a trigger, or we just insert it. Let's insert a placeholder if no trigger exists.
      const { error: userErr } = await admin.from('users').insert({ id: userId, email, full_name: 'Invitado' }).select().maybeSingle()
      // Ignore error if it violates unique constraint because trigger already created it
    }

    // 3. Add to team_members
    const { error: teamErr } = await admin
      .from('team_members')
      .insert({
        org_id: orgId,
        user_id: userId,
        role: role,
        department_id: department_id || null
      })

    if (teamErr) return err('El usuario ya pertenece al equipo o hubo un error al añadirlo: ' + teamErr.message)
    
    return ok(true)
  } catch (e: any) {
    return err(e.message)
  }
}
