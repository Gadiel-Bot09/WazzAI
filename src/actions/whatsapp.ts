'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evolutionClient } from '@/lib/evolution/client'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

/**
 * Creates a new whatsapp_instances record and initializes it in Evolution API
 */
export async function createWhatsAppInstanceAction(name: string): Promise<ActionResult<{ id: string }>> {
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
  
  // 1. Insert into DB to get UUID
  const { data: created, error } = await (admin as any)
    .from('whatsapp_instances')
    .insert({
      org_id: orgId,
      name: name,
      status: 'connecting',
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('createWhatsAppInstanceAction error:', error)
    return err('Error al crear la instancia en base de datos')
  }

  // 2. Create in Evolution API
  try {
    await evolutionClient.createInstance(created.id)
  } catch (e) {
    console.error('Evolution create error:', e)
    // Optional: we could delete the DB record if evolution fails, or let them retry
    return err('Error al iniciar la instancia en el servidor de WhatsApp')
  }

  return ok({ id: created.id })
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
    .select('id, name, status')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getInstancesListAction error:', error)
    return err('Error al obtener instancias')
  }

  return ok(data || [])
}

/**
 * Gets or creates the WhatsApp QR Code for the specific instance
 */
export async function getWhatsAppQRAction(instanceId: string): Promise<ActionResult<{ base64: string | null; state: string }>> {
  const supabase = await createClient()
  
  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  // 2. Ensure user owns this instance (org_id match)
  const { data: profile } = await (supabase as any).from('users').select('org_id').eq('id', user.id).single()
  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data: instance } = await (admin as any).from('whatsapp_instances').select('id').eq('id', instanceId).eq('org_id', orgId).single()
  if (!instance) return err('Instancia no encontrada')

  try {
    // 3. Try to get connection state first
    const state = await evolutionClient.getConnectionState(instanceId)
    
    // Si no existe la instancia en Evolution, la creamos de nuevo
    if (!state) {
      const creationResponse = await evolutionClient.createInstance(instanceId)
      if (creationResponse.qrcode?.base64) {
        return ok({ base64: creationResponse.qrcode.base64, state: 'connecting' })
      }
    }

    // 4. Si ya está conectado, actualizar estado en DB
    const connectionState = state?.state || state?.status
    if (connectionState === 'open') {
      await (admin as any)
        .from('whatsapp_instances')
        .update({ status: 'connected', connected_at: new Date().toISOString() })
        .eq('id', instanceId)
      return ok({ base64: null, state: 'open' })
    }

    // 5. Si no está conectado, obtenemos el QR
    const qrResponse = await evolutionClient.getQRCode(instanceId)
    
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
 * Disconnects the WhatsApp session for the specific instance
 */
export async function disconnectWhatsAppAction(instanceId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await (supabase as any).from('users').select('org_id').eq('id', user.id).single()
  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data: instance } = await (admin as any).from('whatsapp_instances').select('id').eq('id', instanceId).eq('org_id', orgId).single()
  if (!instance) return err('Instancia no encontrada')

  try {
    await evolutionClient.logoutInstance(instanceId)
    
    await (admin as any)
      .from('whatsapp_instances')
      .update({ status: 'disconnected' })
      .eq('id', instanceId)

    return ok(undefined)
  } catch (error) {
    console.error('Error in disconnectWhatsAppAction:', error)
    return err('Error al desconectar WhatsApp')
  }
}

/**
 * Deletes the WhatsApp instance completely
 */
export async function deleteWhatsAppInstanceAction(instanceId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  const { data: profile } = await (supabase as any).from('users').select('org_id').eq('id', user.id).single()
  const orgId = (profile as any)?.org_id
  if (!orgId) return err('Organización no encontrada')

  const admin = createAdminClient()
  const { data: instance } = await (admin as any).from('whatsapp_instances').select('id').eq('id', instanceId).eq('org_id', orgId).single()
  if (!instance) return err('Instancia no encontrada')

  try {
    // Delete from Evolution API (logoutInstance actually sends DELETE request in evolutionClient)
    await evolutionClient.logoutInstance(instanceId)
    
    // Delete from DB
    await (admin as any)
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId)

    return ok(undefined)
  } catch (error) {
    console.error('Error in deleteWhatsAppInstanceAction:', error)
    return err('Error al eliminar la instancia')
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

