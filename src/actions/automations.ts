'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { revalidatePath } from 'next/cache'

async function getUserAndOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const p = profile as any
  return { user, orgId: p?.org_id as string | null }
}

export interface AutomationFlow {
  id: string
  name: string
  description: string | null
  trigger_type: 'keyword' | 'welcome' | 'both'
  trigger_keywords: string[]
  nodes: any[]
  edges: any[]
  is_active: boolean
}

export async function getFlowsAction(): Promise<ActionResult<AutomationFlow[]>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('automation_flows')
    .select('*')
    .eq('org_id', ctx.orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFlowsAction error:', error)
    return err('Error al obtener flujos')
  }

  return ok(data || [])
}

export async function getFlowAction(id: string): Promise<ActionResult<AutomationFlow>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('automation_flows')
    .select('*')
    .eq('id', id)
    .eq('org_id', ctx.orgId)
    .single()

  if (error || !data) return err('Flujo no encontrado')
  return ok(data)
}

export async function createFlowAction(data: Partial<AutomationFlow>): Promise<ActionResult<AutomationFlow>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { data: created, error } = await (admin as any)
    .from('automation_flows')
    .insert({
      org_id: ctx.orgId,
      name: data.name || 'Nuevo Flujo',
      description: data.description || '',
      trigger_type: data.trigger_type || 'keyword',
      trigger_keywords: data.trigger_keywords || [],
      nodes: data.nodes || [],
      edges: data.edges || [],
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('createFlowAction error:', error)
    return err('Error al crear el flujo')
  }

  revalidatePath('/dashboard/automations')
  return ok(created)
}

export async function updateFlowAction(id: string, data: Partial<AutomationFlow>): Promise<ActionResult<AutomationFlow>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  
  // Exclude id and org_id from updates
  const { id: _id, ...updates } = data as any
  updates.updated_at = new Date().toISOString()

  const { data: updated, error } = await (admin as any)
    .from('automation_flows')
    .update(updates)
    .eq('id', id)
    .eq('org_id', ctx.orgId)
    .select()
    .single()

  if (error) {
    console.error('updateFlowAction error:', error)
    return err('Error al actualizar el flujo')
  }

  revalidatePath('/dashboard/automations')
  return ok(updated)
}

export async function deleteFlowAction(id: string): Promise<ActionResult<void>> {
  const ctx = await getUserAndOrg()
  if (!ctx || !ctx.orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('automation_flows')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) {
    console.error('deleteFlowAction error:', error)
    return err('Error al eliminar el flujo')
  }

  revalidatePath('/dashboard/automations')
  return ok(undefined)
}
