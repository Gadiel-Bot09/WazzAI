'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

export async function getColumnsAction(): Promise<ActionResult<any[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) return err('Organización no encontrada')

  const { data: columns, error } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('position', { ascending: true })

  if (error) {
    console.error('getColumnsAction error:', error)
    return err('Error al obtener las columnas')
  }

  return ok(columns)
}

export async function getLeadsAction(): Promise<ActionResult<any[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profileData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile?.org_id) return err('Organización no encontrada')

  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      contact:contacts(name, phone_number, avatar_url),
      conversations(id, last_message_preview, unread_count)
    `)
    .eq('org_id', profile.org_id)
    .order('position', { ascending: true })

  if (error) {
    console.error('getLeadsAction error:', error)
    return err('Error al obtener los leads')
  }

  return ok(leads)
}

export async function moveLeadAction(
  leadId: string, 
  columnId: string, 
  newPosition: number
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('leads')
    .update({ 
      column_id: columnId, 
      position: newPosition,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)

  if (error) {
    console.error('moveLeadAction error:', error)
    return err('Error al mover el lead')
  }

  return ok(undefined)
}
