'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'

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

export async function getRolesAction() {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('roles')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function createRoleAction(payload: { name: string, permissions: any }) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('roles')
      .insert({ org_id: orgId, ...payload })
      .select('*')
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    return err(e.message)
  }
}

export async function updateRoleAction(id: string, payload: { name: string, permissions: any }) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('roles')
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

export async function deleteRoleAction(id: string) {
  try {
    const orgId = await getCurrentOrg()
    const admin = createAdminClient() as any
    const { error } = await admin
      .from('roles')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return err(error.message)
    return ok(null)
  } catch (e: any) {
    return err(e.message)
  }
}
