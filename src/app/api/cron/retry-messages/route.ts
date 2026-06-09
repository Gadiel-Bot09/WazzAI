import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evolutionClient } from '@/lib/evolution/client'

// Este endpoint es llamado por cron-job.org cada minuto
export async function GET(request: Request) {
  // 1. Verificación de Seguridad
  // Requiere configurar CRON_SECRET en el .env de Vercel y en los headers de cron-job.org
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Si CRON_SECRET está definido en el .env, validarlo.
  // Si no está definido (por ej en desarrollo o si el usuario olvida configurarlo), permitimos pasar pero con advertencia.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()

    // 2. Buscar mensajes encolados que tengan más de 10 segundos de antigüedad
    // (para no interferir con el envío inmediato original)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()

    const { data: queuedMessages, error: fetchError } = await (adminClient as any)
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        media_url,
        media_type,
        metadata,
        conversations (
          instance_id,
          contacts (
            phone_number
          )
        )
      `)
      .eq('status', 'queued')
      .in('direction', ['outbound', 'ai'])
      .lt('created_at', tenSecondsAgo)
      .limit(50)

    if (fetchError) {
      console.error('[CRON] Error fetching queued messages:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!queuedMessages || queuedMessages.length === 0) {
      return NextResponse.json({ success: true, message: 'No queued messages found' })
    }

    let successCount = 0
    let failCount = 0

    // 3. Reintentar cada mensaje
    for (const msg of queuedMessages) {
      const conv = msg.conversations
      const instanceId = conv?.instance_id
      const phone = conv?.contacts?.phone_number

      if (!instanceId || !phone) {
        // Data inválida, marcar como failed
        await updateMessageStatus(adminClient, msg.id, 'failed', msg.metadata, 'Falta instance_id o phone_number')
        continue
      }

      try {
        if (msg.media_url) {
          // Enviar Media
          const mediaType = msg.media_type || msg.message_type
          let evoMediaType: 'image' | 'video' | 'audio' | 'document' = 'document'
          
          if (mediaType.startsWith('image/') || mediaType === 'image') evoMediaType = 'image'
          else if (mediaType.startsWith('video/') || mediaType === 'video') evoMediaType = 'video'
          else if (mediaType.startsWith('audio/') || mediaType === 'audio') evoMediaType = 'audio'

          await evolutionClient.sendMedia(instanceId, phone, msg.media_url, evoMediaType, msg.content || undefined)
        } else {
          // Enviar Texto
          await evolutionClient.sendTextMessage(instanceId, phone, msg.content || '')
        }

        // Si llegó aquí, tuvo éxito
        await (adminClient as any).from('messages').update({ status: 'sent' }).eq('id', msg.id)
        successCount++

      } catch (evoErr: any) {
        // Falló el envío. Incrementar contador de reintentos
        failCount++
        await updateMessageStatus(adminClient, msg.id, 'queued', msg.metadata, evoErr.message || 'Unknown error')
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: queuedMessages.length,
      successCount,
      failCount
    })

  } catch (err: any) {
    console.error('[CRON] Fatal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Función auxiliar para actualizar el estado y manejar reintentos
async function updateMessageStatus(adminClient: any, messageId: string, currentStatus: string, metadata: any, errorStr: string) {
  let newMeta = metadata || {}
  if (typeof newMeta !== 'object') newMeta = {}

  newMeta.retry_count = (newMeta.retry_count || 0) + 1
  newMeta.last_error = errorStr

  let nextStatus = currentStatus
  if (newMeta.retry_count >= 5) {
    nextStatus = 'failed' // Abandonar después de 5 intentos fallidos
  }

  await adminClient.from('messages').update({
    status: nextStatus,
    metadata: newMeta
  }).eq('id', messageId)
}
