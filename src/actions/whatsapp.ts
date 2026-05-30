'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evolutionClient } from '@/lib/evolution/client'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

/**
 * Ensures the whatsapp_instances record exists in DB for the given org.
 * C4-FIX: Always persist the instance so AI config can reference it.
 */
async function ensureInstanceInDB(orgId: string): Promise<string | null> {
  const admin = createAdminClient()
  // Check if already exists
  const { data: existing } = await (admin as any)
    .from('whatsapp_instances')
    .select('id')
    .eq('org_id', orgId)
    .single()

  if (existing?.id) return existing.id

  // Create it
  const instanceName = `wazzai_${orgId.replace(/-/g, '')}`
  const { data: created, error } = await (admin as any)
    .from('whatsapp_instances')
    .insert({
      org_id: orgId,
      name: instanceName,
      status: 'connecting',
    })
    .select('id')
    .single()

  if (error) {
    console.error('ensureInstanceInDB insert error:', error)
  }

  return created?.id ?? null
}

/**
 * Gets all WhatsApp instances for the current user's organization
 */
export async function getInstancesListAction(): Promise<ActionResult<{ id: string; name: string }[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('whatsapp_instances')
    .select('id, name')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getInstancesListAction error:', error)
    return err('Error al obtener instancias')
  }

  return ok(data || [])
}

/**
 * Gets or creates the WhatsApp QR Code for the current user's organization
 */
export async function getWhatsAppQRAction(): Promise<ActionResult<{ base64: string | null; state: string }>> {
  const supabase = await createClient()
  
  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  // 2. Get user's active organization
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  try {
    // 3. Ensure instance exists in DB (C4-FIX)
    await ensureInstanceInDB(orgId)

    // 4. Try to get connection state first
    const state = await evolutionClient.getConnectionState(orgId)
    
    // Si no existe la instancia en Evolution, la creamos
    if (!state) {
      const creationResponse = await evolutionClient.createInstance(orgId)
      if (creationResponse.qrcode?.base64) {
        return ok({ base64: creationResponse.qrcode.base64, state: 'connecting' })
      }
    }

    // 5. Si ya está conectado, actualizar estado en DB
    const connectionState = state?.state || state?.status
    if (connectionState === 'open') {
      const admin = createAdminClient()
      await (admin as any)
        .from('whatsapp_instances')
        .update({ status: 'connected', connected_at: new Date().toISOString() })
        .eq('org_id', orgId)
      return ok({ base64: null, state: 'open' })
    }

    // 6. Si no está conectado, obtenemos el QR
    const qrResponse = await evolutionClient.getQRCode(orgId)
    
    return ok({ 
      base64: qrResponse?.base64 || null, 
      state: connectionState || 'connecting' 
    })
    
  } catch (error) {
    console.error('Error in getWhatsAppQRAction:', error)
    return err('Error de comunicación con el servicio de WhatsApp')
  }
}

/**
 * Disconnects the WhatsApp session for the current user's org
 */
export async function disconnectWhatsAppAction(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  try {
    await evolutionClient.logoutInstance(orgId)
    const admin = createAdminClient()
    await (admin as any)
      .from('whatsapp_instances')
      .update({ status: 'disconnected', connected_at: null })
      .eq('org_id', orgId)
    return ok(undefined)
  } catch (e) {
    console.error('disconnectWhatsAppAction error:', e)
    return err('Error al desconectar WhatsApp')
  }
}

/**
 * Get WhatsApp specific settings like ignoring groups
 */
export async function getWhatsAppSettingsAction(): Promise<ActionResult<{ ignoreGroups: boolean }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data: org } = await (admin as any).from('organizations').select('metadata').eq('id', orgId).single()
  const meta = (org?.metadata as Record<string, any>) || {}
  
  return ok({ ignoreGroups: !!meta.ignore_groups })
}

/**
 * Update WhatsApp specific settings like ignoring groups
 */
export async function updateWhatsAppSettingsAction(ignoreGroups: boolean): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data: org } = await (admin as any).from('organizations').select('metadata').eq('id', orgId).single()
  const meta = (org?.metadata as Record<string, any>) || {}
  
  meta.ignore_groups = ignoreGroups

  await (admin as any).from('organizations').update({ metadata: meta }).eq('id', orgId)
  return ok(undefined)
}

