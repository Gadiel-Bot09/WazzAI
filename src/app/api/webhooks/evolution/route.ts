import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIResponse, saveAndSendAIMessage } from '@/lib/ai/rag'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event, instance, data } = body

    // Extraer orgId del nombre de la instancia (ej. wazzai_12345abcd)
    if (!instance || !instance.startsWith('wazzai_')) {
      return NextResponse.json({ error: 'Instancia inválida' }, { status: 400 })
    }
    
    // El orgId original tenía guiones que quitamos al crear la instancia.
    // Buscaremos la organización en Supabase usando un enfoque seguro.
    const supabaseAdmin = createAdminClient()

    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = data?.state || data?.status || data?.instance?.state
      const statusReason = data?.statusReason || data?.reason || 0
      
      console.log(`[Webhook] Instance ${instance} connection update: ${state} (Reason: ${statusReason})`)
      
      // Actualizar estado en la tabla whatsapp_instances
      const { data: orgs } = await supabaseAdmin.from('organizations').select('id')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const org = (orgs as any[])?.find(o => `wazzai_${o.id.replace(/-/g, '')}` === instance) as any
      
      if (org && state) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any)
          .from('whatsapp_instances')
          .update({ 
            status: state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
            ...(state === 'open' ? { connected_at: new Date().toISOString() } : {})
          })
          .eq('org_id', org.id)
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

      // Obtener el org_id real a partir del nombre de instancia
      // Como le quitamos los guiones en client.ts: orgId.replace(/-/g, '')
      // Lo ideal es tener una tabla "channels" o buscar orgId.
      // En el esquema Módulo 1 pusimos 'whatsapp_instances' o podemos buscar directo.
      // Por simplicidad en la prueba de concepto, busquemos todas las orgs y hagamos match.
      const { data: orgs } = await supabaseAdmin.from('organizations').select('id')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const org = (orgs as any[])?.find(o => `wazzai_${o.id.replace(/-/g, '')}` === instance) as any
      
      if (!org) {
        console.error(`No org found for instance ${instance}`)
        return NextResponse.json({ error: 'Org not found' }, { status: 404 })
      }

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
      let conversationId = null
      const { data: existingConv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('org_id', org.id)
        .eq('contact_id', contactId)
        .eq('status', 'open')
        .single()

      if (existingConv) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversationId = (existingConv as any).id
      } else {
        // Obtener la instancia
        const { data: instanceDataRaw } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('id')
          .eq('org_id', org.id)
          .single()
        const instanceData = instanceDataRaw as any

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newConv } = await (supabaseAdmin as any)
          .from('conversations')
          .insert({
            org_id: org.id,
            instance_id: instanceData?.id,
            contact_id: contactId,
            status: 'open',
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single()
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (newConv) conversationId = (newConv as any).id
      }

      // 2. Guardar el mensaje
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabaseAdmin as any)
        .from('messages')
        .insert({
          conversation_id: conversationId,
          org_id: org.id,
          content: textContent,
          direction: 'inbound',
          status: 'delivered', // evolution received it
          evolution_msg_id: messageId
        })

      // Actualizar lead para reflejar la última actividad
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from('leads').update({ last_activity_at: new Date().toISOString() }).eq('id', leadId)

      // Actualizar conversación
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from('conversations').update({ 
        last_message_at: new Date().toISOString(),
        last_message_preview: textContent.substring(0, 50)
      }).eq('id', conversationId)

      if (insertError) {
        console.error('Error saving message:', insertError)
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
      }

      // 3. Verificar si la IA está activa para esta conversación y disparar respuesta
      if (conversationId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: convCheck } = await (supabaseAdmin as any)
          .from('conversations')
          .select('is_ai_active, instance_id')
          .eq('id', conversationId)
          .single()

        if (convCheck?.is_ai_active && convCheck?.instance_id) {
          // Disparar en background — no bloqueamos la respuesta del webhook
          generateAIResponse({
            conversationId,
            orgId: org.id,
            instanceId: convCheck.instance_id,
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
