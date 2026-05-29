'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface Contact {
  id: string
  org_id: string
  name: string | null
  phone_number: string
  email: string | null
  avatar_url: string | null
  tags: string[]
  notes: string | null
  is_blocked: boolean
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

export interface ContactFormData {
  name: string
  phone_number: string
  email?: string
  notes?: string
  tags?: string[]
}

export interface GetContactsOptions {
  search?: string
  page?: number
  pageSize?: number
  onlyBlocked?: boolean
}

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  return (data as any)?.org_id ?? null
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getContactsAction(
  opts: GetContactsOptions = {}
): Promise<ActionResult<{ contacts: Contact[]; total: number }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const orgId = await getOrgId()
  if (!orgId) return err('Organización no encontrada')

  const { search = '', page = 1, pageSize = 25, onlyBlocked = false } = opts
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search.trim()) {
    query = query.or(
      `name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`
    )
  }
  if (onlyBlocked) {
    query = query.eq('is_blocked', true)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('getContactsAction error:', error)
    return err('Error al obtener contactos')
  }

  return ok({ contacts: (data ?? []) as Contact[], total: count ?? 0 })
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createContactAction(
  formData: ContactFormData
): Promise<ActionResult<Contact>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  // Normalise phone
  const phone = formData.phone_number.replace(/\D/g, '')
  if (!phone) return err('Número de teléfono inválido')

  const admin = createAdminClient()

  // Check duplicate
  const { data: existing } = await (admin as any)
    .from('contacts')
    .select('id')
    .eq('org_id', orgId)
    .eq('phone_number', phone)
    .single()

  if (existing) return err('Ya existe un contacto con ese número de teléfono')

  const { data, error } = await (admin as any)
    .from('contacts')
    .insert({
      org_id: orgId,
      name: formData.name.trim(),
      phone_number: phone,
      email: formData.email?.trim() || null,
      notes: formData.notes?.trim() || null,
      tags: formData.tags ?? [],
    })
    .select('*')
    .single()

  if (error) {
    console.error('createContactAction error:', error)
    return err('Error al crear el contacto')
  }

  revalidatePath('/dashboard/contacts')
  return ok(data as Contact)
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateContactAction(
  id: string,
  formData: Partial<ContactFormData> & { is_blocked?: boolean }
): Promise<ActionResult<Contact>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (formData.name !== undefined) updates.name = formData.name.trim()
  if (formData.phone_number !== undefined)
    updates.phone_number = formData.phone_number.replace(/\D/g, '')
  if (formData.email !== undefined) updates.email = formData.email.trim() || null
  if (formData.notes !== undefined) updates.notes = formData.notes.trim() || null
  if (formData.tags !== undefined) updates.tags = formData.tags
  if (formData.is_blocked !== undefined) updates.is_blocked = formData.is_blocked
  updates.updated_at = new Date().toISOString()

  const { data, error } = await (admin as any)
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select('*')
    .single()

  if (error) {
    console.error('updateContactAction error:', error)
    return err('Error al actualizar el contacto')
  }

  revalidatePath('/dashboard/contacts')
  return ok(data as Contact)
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteContactAction(id: string): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) {
    console.error('deleteContactAction error:', error)
    return err('Error al eliminar el contacto')
  }

  revalidatePath('/dashboard/contacts')
  return ok(undefined)
}

// ─── IMPORT ───────────────────────────────────────────────────────────────────

export async function importContactsAction(
  csvText: string
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return err('El CSV está vacío o no tiene datos')

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  const nameIdx = headers.findIndex(h => ['name', 'nombre'].includes(h))
  const phoneIdx = headers.findIndex(h => ['phone', 'phone_number', 'telefono', 'teléfono', 'numero', 'número'].includes(h))
  const emailIdx = headers.findIndex(h => ['email', 'correo'].includes(h))
  const notesIdx = headers.findIndex(h => ['notes', 'notas'].includes(h))
  const tagsIdx = headers.findIndex(h => ['tags', 'etiquetas'].includes(h))

  if (phoneIdx === -1) return err('El CSV debe tener una columna "phone_number" o "telefono"')

  const admin = createAdminClient()

  // Fetch existing phones to avoid duplicates
  const { data: existingData } = await (admin as any)
    .from('contacts')
    .select('phone_number')
    .eq('org_id', orgId)

  const existingPhones = new Set<string>(
    ((existingData ?? []) as { phone_number: string }[]).map(c => c.phone_number)
  )

  const toInsert: Record<string, unknown>[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    const phone = cols[phoneIdx]?.replace(/\D/g, '')
    if (!phone) { skipped++; continue }
    if (existingPhones.has(phone)) { skipped++; continue }

    const tags = tagsIdx >= 0 && cols[tagsIdx]
      ? cols[tagsIdx].split(';').map(t => t.trim()).filter(Boolean)
      : []

    toInsert.push({
      org_id: orgId,
      phone_number: phone,
      name: nameIdx >= 0 ? (cols[nameIdx] || phone) : phone,
      email: emailIdx >= 0 ? (cols[emailIdx] || null) : null,
      notes: notesIdx >= 0 ? (cols[notesIdx] || null) : null,
      tags,
    })
    existingPhones.add(phone)
  }

  if (toInsert.length === 0) {
    return ok({ imported: 0, skipped })
  }

  const { error } = await (admin as any).from('contacts').insert(toInsert)

  if (error) {
    console.error('importContactsAction error:', error)
    return err(`Error al importar: ${error.message}`)
  }

  revalidatePath('/dashboard/contacts')
  return ok({ imported: toInsert.length, skipped })
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export async function exportContactsAction(): Promise<ActionResult<string>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('contacts')
    .select('name,phone_number,email,notes,tags,is_blocked,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return err('Error al exportar contactos')

  const rows = (data ?? []) as any[]
  const headers = ['name', 'phone_number', 'email', 'notes', 'tags', 'is_blocked', 'created_at']

  const escape = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join(';') : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')

  return ok(csv)
}
