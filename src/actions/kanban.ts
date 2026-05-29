'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

// ─── Helper ────────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('users').select('org_id').eq('id', user.id).single()
  return (data as any)?.org_id ?? null
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getColumnsAction(): Promise<ActionResult<any[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase as any).from('users').select('org_id').eq('id', user.id).single()
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase as any).from('users').select('org_id').eq('id', user.id).single()
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

// ─── Move Lead ─────────────────────────────────────────────────────────────────

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

// ─── Create Lead ───────────────────────────────────────────────────────────────

export async function createLeadAction(input: {
  title: string
  column_id: string
  contact_name?: string
  contact_phone?: string
  notes?: string
}): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()

  // Buscar o crear contacto si se dio teléfono
  let contactId: string | null = null
  if (input.contact_phone?.trim()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingContact } = await (admin as any)
      .from('contacts')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone_number', input.contact_phone)
      .single()

    if ((existingContact as any)?.id) {
      contactId = (existingContact as any).id
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newContact } = await (admin as any)
        .from('contacts')
        .insert({
          org_id: orgId,
          phone_number: input.contact_phone,
          name: input.contact_name || input.contact_phone,
        })
        .select('id')
        .single()
      contactId = (newContact as any)?.id ?? null
    }
  }

  // Calcular posición al final de la columna
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastLead } = await (admin as any)
    .from('leads')
    .select('position')
    .eq('column_id', input.column_id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = ((lastLead as any)?.position ?? 0) + 1000

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('leads')
    .insert({
      org_id: orgId,
      column_id: input.column_id,
      contact_id: contactId,
      title: input.title,
      notes: input.notes || null,
      position,
    })

  if (error) {
    console.error('createLeadAction error:', error)
    return err('Error al crear el lead')
  }

  return ok(undefined)
}

// ─── Column CRUD ───────────────────────────────────────────────────────────────

export async function createColumnAction(input: {
  name: string
  color: string
}): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastCol } = await (admin as any)
    .from('kanban_columns')
    .select('position')
    .eq('org_id', orgId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = ((lastCol as any)?.position ?? 0) + 1000

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('kanban_columns')
    .insert({ org_id: orgId, name: input.name, color: input.color, position })

  if (error) return err('Error al crear la columna')
  return ok(undefined)
}

export async function updateColumnAction(
  columnId: string,
  input: { name?: string; color?: string }
): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('kanban_columns')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', columnId)
    .eq('org_id', orgId)

  if (error) return err('Error al actualizar la columna')
  return ok(undefined)
}

export async function deleteColumnAction(columnId: string): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('kanban_columns')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  if ((count ?? 0) <= 1) return err('Debes tener al menos una columna')

  const admin = createAdminClient()
  // Mover leads de esta columna a la primera columna disponible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otherCol } = await (admin as any)
    .from('kanban_columns')
    .select('id')
    .eq('org_id', orgId)
    .neq('id', columnId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if ((otherCol as any)?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('leads')
      .update({ column_id: (otherCol as any).id })
      .eq('column_id', columnId)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('kanban_columns')
    .delete()
    .eq('id', columnId)
    .eq('org_id', orgId)

  if (error) return err('Error al eliminar la columna')
  return ok(undefined)
}
