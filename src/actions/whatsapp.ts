'use server'

import { createClient } from '@/lib/supabase/server'
import { evolutionClient } from '@/lib/evolution/client'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

/**
 * Gets or creates the WhatsApp QR Code for the current user's organization
 */
export async function getWhatsAppQRAction(): Promise<ActionResult<{ base64: string | null; state: string }>> {
  const supabase = await createClient()
  
  // 1. Get user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autorizado')

  // 2. Get user's active organization
  const { data: profile } = await supabase
    .from('users')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (profile as any)?.active_organization_id
  if (!orgId) return err('Organización no encontrada')

  try {
    // 3. Try to get connection state first
    const state = await evolutionClient.getConnectionState(orgId)
    
    // Si no existe la instancia, la creamos
    if (!state) {
      const creationResponse = await evolutionClient.createInstance(orgId)
      // En Evolution v2, la respuesta de creación suele traer el qrCode en base64
      if (creationResponse.qrcode?.base64) {
        return ok({ base64: creationResponse.qrcode.base64, state: 'connecting' })
      }
    }

    // 4. Si ya existe, comprobamos estado
    if (state?.status === 'open') {
      return ok({ base64: null, state: 'open' })
    }

    // 5. Si no está conectado, obtenemos el QR
    const qrResponse = await evolutionClient.getQRCode(orgId)
    
    return ok({ 
      base64: qrResponse?.base64 || null, 
      state: state?.status || 'connecting' 
    })
    
  } catch (error) {
    console.error('Error in getWhatsAppQRAction:', error)
    return err('Error de comunicación con el servicio de WhatsApp')
  }
}
