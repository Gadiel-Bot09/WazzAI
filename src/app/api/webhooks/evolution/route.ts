import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIResponse, saveAndSendAIMessage } from '@/lib/ai/rag'
import { processAutomations } from '@/lib/automations/engine'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event, instance, data } = body

    console.log(`[Webhook] Received event: ${event} from instance: ${instance}`)

    if (!instance) {
      return NextResponse.json({ error: 'Instance missing from payload' }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()

    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = data?.state || data?.status || data?.instance?.state
      const statusReason = data?.statusReason || data?.reason || 0
      
      console.log(`[Webhook] Instance ${instance} connection update: ${state} (Reason: ${statusReason})`)
      
      // Try to find the instance by name (supports both wazzai_ prefix and custom names)
      let waInstanceForConn: any = null

      if (instance.startsWith('wazzai_')) {
        const instanceIdStr = instance.replace('wazzai_', '')
        const uuid = `${instanceIdStr.slice(0,8)}-${instanceIdStr.slice(8,12)}-${instanceIdStr.slice(12,16)}-${instanceIdStr.slice(16,20)}-${instanceIdStr.slice(20)}`
        const { data: r } = await supabaseAdmin.from('whatsapp_instances').select('id, org_id').eq('id', uuid).single()
        waInstanceForConn = r
      } else {
        // Fallback: search by name column (Evolution sends back the instance name)
        const { data: r } = await (supabaseAdmin as any).from('whatsapp_instances').select('id, org_id').eq('name', instance).single()
        waInstanceForConn = r
      }
      
      if (waInstanceForConn && state) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any)
          .from('whatsapp_instances')
          .update({ 
            status: state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
            ...(state === 'open' ? { connected_at: new Date().toISOString() } : {})
          })
          .eq('id', waInstanceForConn.id)
      }
      
      return NextResponse.json({ success: true })
    }

    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      // Data es un array de mensajes o un objeto dependiendo de byEvents config.
      // Suponemos que recibimos el objeto del mensaje directamente.
      let messageObj = data
      if (Array.isArray(data)) messageObj = data[0]
      if (data?.messages && Array.isArray(data.messages)) messageObj = data.messages[0]
      
      const message = messageObj?.message
      const key = messageObj?.key
      
      // Ignorar actualizaciones de sistema o de nosotros mismos si no queremos guardarlas doble
      if (!message || !key || key.fromMe) {
        return NextResponse.json({ success: true, ignored: true })
      }

      // Procesar texto
      let textContent = ''
      if (message.conversation) {
        textContent = message.conversation
      } else if (message.extendedTextMessage?.text) {
        textContent = message.extendedTextMessage.text
      } else if (message.imageMessage) {
        textContent = message.imageMessage.caption || '[Imagen]'
      } else {
        textContent = '[Mensaje multimedia no soportado en esta fase]'
      }

      const phone = key.remoteJid.replace('@s.whatsapp.net', '')
      const messageId = key.id

      // Obtener la instancia y el org_id a partir del nombre de instancia
      // Supports both wazzai_ prefix (UUID-based) and arbitrary instance names
      let waInstance: any = null

      if (instance.startsWith('wazzai_')) {
        const instanceIdStr = instance.replace('wazzai_', '')
        const uuid = `${instanceIdStr.slice(0,8)}-${instanceIdStr.slice(8,12)}-${instanceIdStr.slice(12,16)}-${instanceIdStr.slice(16,20)}-${instanceIdStr.slice(20)}`
        const { data: r } = await supabaseAdmin.from('whatsapp_instances').select('id, org_id').eq('id', uuid).single()
        waInstance = r
      } else {
        // Fallback: search by name column (Evolution sends back the instance name it was given)
        const { data: r } = await (supabaseAdmin as any)
          .from('whatsapp_instances')
          .select('id, org_id')
          .eq('name', instance)
          .single()
        waInstance = r
      }
      if (!waInstance) {
        console.error(`No instance found for ${instance}`)
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
      }
      
      const { data: orgData } = await supabaseAdmin.from('organizations').select('id, metadata').eq('id', waInstance.org_id).single()
      const org = orgData as any
      
      if (!org) {
        console.error(`No org found for instance ${instance}`)
        return NextResponse.json({ error: 'Org not found' }, { status: 404 })
      }

      // ── Check if we should ignore group messages ────────────────────────────
      const isGroup = key.remoteJid.includes('@g.us')
      if (isGroup) {
        const meta = (org.metadata as any) || {}
        if (meta.ignore_groups === true) {
          console.log(`[Webhook] Ignoring group message from ${key.remoteJid} for org ${org.id}`)
          return NextResponse.json({ success: true, ignored: true, reason: 'group_ignored' })
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      // ── Check if this is a survey response ─────────────────────────────────
      const surveyScore = parseInt(textContent.trim(), 10)
      if (surveyScore >= 1 && surveyScore <= 5 && textContent.trim().length === 1) {
        // Look for a pending survey for this contact
        const { data: pendingContact } = await (supabaseAdmin as any)
          .from('contacts')
          .select('id')
          .eq('org_id', org.id)
          .eq('phone_number', phone)
          .single()

        if (pendingContact) {
          const { data: survey } = await (supabaseAdmin as any)
            .from('satisfaction_surveys')
            .select('id')
            .eq('org_id', org.id)
            .eq('contact_id', (pendingContact as any).id)
            .eq('status', 'sent')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (survey) {
            await (supabaseAdmin as any)
              .from('satisfaction_surveys')
              .update({
                score: surveyScore,
                responded_at: new Date().toISOString(),
                status: 'responded',
              })
              .eq('id', (survey as any).id)

            console.log(`[Webhook] Survey ${(survey as any).id} scored ${surveyScore} by ${phone}`)
            return NextResponse.json({ success: true, survey_captured: true })
          }
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      // 1. Asegurar que existe un Lead/Contacto para este teléfono
      let leadId = null
      let contactId = null

      // Buscar o crear contacto
      const { data: existingContact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('org_id', org.id)
        .eq('phone_number', phone)
        .single()

      if (existingContact) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contactId = (existingContact as any).id
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newContact } = await (supabaseAdmin as any)
          .from('contacts')
          .insert({
            org_id: org.id,
            phone_number: phone,
            name: data.pushName || phone
          })
          .select('id')
          .single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (newContact) contactId = (newContact as any).id
      }

      if (!contactId) return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })

      // Buscar si el contacto tiene un Lead activo
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('org_id', org.id)
        .eq('contact_id', contactId)
        .single()

      if (existingLead) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        leadId = (existingLead as any).id
      } else {
        // Encontrar la primera columna Kanban
        const { data: colData } = await supabaseAdmin
          .from('kanban_columns')
          .select('id')
          .eq('org_id', org.id)
          .order('position', { ascending: true })
          .limit(1)
          .single()
        const col = colData as any

        let firstColId = col?.id
        if (!firstColId) {
          // Si no hay columnas, crear una por defecto
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: newCol } = await (supabaseAdmin as any)
            .from('kanban_columns')
            .insert({ org_id: org.id, name: 'Nuevo', color: '#3b82f6', position: 1000 })
            .select('id')
            .single()
          if (newCol) firstColId = newCol.id
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newLead } = await (supabaseAdmin as any)
          .from('leads')
          .insert({
            org_id: org.id,
            column_id: firstColId,
            contact_id: contactId,
            title: `Lead: ${data.pushName || phone}`,
            position: Date.now() // Posición inicial
          })
          .select('id')
          .single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (newLead) leadId = (newLead as any).id
      }

      if (!leadId) {
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
      }

      // Buscar o crear conversación
      // IMPORTANT: We check 'open' AND 'pending' to avoid re-creating after handoff
      let conversationId = null
      let existingConvStatus: string | null = null
      const { data: existingConvData } = await supabaseAdmin
        .from('conversations')
        .select('id, status, is_ai_active')
        .eq('org_id', org.id)
        .eq('contact_id', contactId)
        .eq('instance_id', waInstance.id)
        .in('status', ['open', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)

      const existingConv = existingConvData?.[0]

      if (existingConv) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversationId = (existingConv as any).id
        existingConvStatus = (existingConv as any).status
      } else {
        // No existing open/pending conversation — create a new one
        const instanceData = waInstance

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newConv } = await (supabaseAdmin as any)
          .from('conversations')
          .insert({
            org_id: org.id,
            instance_id: instanceData?.id,
            contact_id: contactId,
            status: 'open',
            is_ai_active: true,
            last_message_at: new Date().toISOString()
          })
          .select('id, status, is_ai_active')
          .single()
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (newConv) {
          conversationId = (newConv as any).id
          existingConvStatus = 'open'
        }
      }

      // 2. Guardar el mensaje — idempotencia via ON CONFLICT DO NOTHING
      // (Requiere migration 008 que agrega UNIQUE constraint en evolution_msg_id)
      const now = new Date().toISOString()

      let insertedId: string | null = null

      if (messageId) {
        // Si tenemos ID de Evolution, usamos upsert ignorando duplicados (race-condition safe)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error: insertError } = await (supabaseAdmin as any)
          .from('messages')
          .upsert({
            conversation_id: conversationId,
            org_id: org.id,
            content: textContent,
            direction: 'inbound',
            status: 'delivered',
            evolution_msg_id: messageId,
            sent_at: now,
          }, { onConflict: 'evolution_msg_id', ignoreDuplicates: true })
          .select('id')
          .maybeSingle()

        if (insertError) {
          console.error('[Webhook] Error inserting message:', insertError)
          return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
        }

        if (!inserted) {
          // ignoreDuplicates=true returned nothing → el mensaje ya existía → duplicado
          console.log(`[Webhook] Duplicate evolution_msg_id=${messageId}, skipping.`)
          return NextResponse.json({ success: true, duplicate: true })
        }

        insertedId = inserted.id
      } else {
        // Sin ID de Evolution (raro) — insert directo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error: insertError } = await (supabaseAdmin as any)
          .from('messages')
          .insert({
            conversation_id: conversationId,
            org_id: org.id,
            content: textContent,
            direction: 'inbound',
            status: 'delivered',
            sent_at: now,
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('[Webhook] Error inserting message (no msg_id):', insertError)
          return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
        }
        insertedId = inserted?.id
      }

      console.log(`[Webhook] Message saved: id=${insertedId}`)

      // Actualizar lead y conversación
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from('leads').update({ last_activity_at: now }).eq('id', leadId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from('conversations').update({
        last_message_at: now,
        last_message_preview: textContent.substring(0, 50)
      }).eq('id', conversationId)

      // 3. Disparar Automations Y/O IA
      if (conversationId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: convCheck } = await (supabaseAdmin as any)
          .from('conversations')
          .select('is_ai_active, instance_id, status')
          .eq('id', conversationId)
          .single()

        const convStatus = convCheck?.status
        const convInstanceId = convCheck?.instance_id || waInstance.id

        // If conversation is PENDING, a human agent has taken over.
        // Do NOT trigger automations or AI — just notify the agent via realtime.
        if (convStatus === 'pending') {
          console.log(`[Webhook] Conv ${conversationId} is PENDING (human agent mode) — skipping automations`)
          return NextResponse.json({ success: true, pending: true })
        }

        const isFirstMessage = existingConv ? false : true

        // Automations run for OPEN conversations
        const handledByFlow = await processAutomations({
          orgId: org.id,
          contactId: contactId,
          conversationId,
          phone,
          textContent,
          isFirstMessage,
          instanceId: convInstanceId
        })

        // AI RAG only runs if AI is active and no flow handled the message
        if (!handledByFlow && convCheck?.is_ai_active) {
          generateAIResponse({
            conversationId,
            orgId: org.id,
            instanceId: convInstanceId,
            contactPhone: phone,
            incomingMessage: textContent,
          })
            .then(async ({ reply, usedFallback: _ }) => {
              if (reply) {
                await saveAndSendAIMessage({
                  conversationId,
                  orgId: org.id,
                  contactPhone: phone,
                  replyText: reply,
                })
              }
            })
            .catch(e => console.error('[Webhook] RAG pipeline error:', e))
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true, unhandled: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
