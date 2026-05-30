/**
 * rag.ts
 *
 * RAG (Retrieval-Augmented Generation) engine.
 * Handles the full pipeline:
 *  1. Embed the incoming message
 *  2. Retrieve relevant knowledge chunks from pgvector
 *  3. Build a context-aware prompt with conversation history
 *  4. Call OpenAI Chat Completions
 *  5. Return the response (or null if no answer / fallback)
 * 
 * Server-side ONLY.
 */

import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createEmbedding } from './embeddings'
import { evolutionClient } from '@/lib/evolution/client'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('[RAG] OPENAI_API_KEY is not set.')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIConfig {
  model: string
  tone: string
  system_prompt: string | null
  context_messages: number
  temperature: number
  transfer_keywords: string[]
  fallback_message: string
  welcome_message: string | null
  is_active: boolean
}

interface KBChunk {
  id: string
  title: string
  content: string
  similarity: number
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Main entry point for the AI response pipeline.
 * Called after a new inbound message is stored in the DB.
 * 
 * Returns the AI reply text, or null if AI is disabled / error occurred.
 */
export async function generateAIResponse({
  conversationId,
  orgId,
  instanceId,
  contactPhone,
  incomingMessage,
}: {
  conversationId: string
  orgId: string
  instanceId: string
  contactPhone: string
  incomingMessage: string
}): Promise<{ reply: string | null; usedFallback: boolean }> {
  const admin = createAdminClient()

  // ── 1. Fetch AI config for this instance ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: configData } = await (admin as any)
    .from('ai_configs')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('org_id', orgId)
    .single()

  const config = configData as AIConfig | null

  // If no config or AI is disabled, skip silently
  if (!config || !config.is_active) {
    return { reply: null, usedFallback: false }
  }

  // ── 2. Check for transfer keywords ──────────────────────────────────────────
  const lowerMsg = incomingMessage.toLowerCase()
  const hasTransferKeyword = (config.transfer_keywords || []).some(kw =>
    lowerMsg.includes(kw.toLowerCase())
  )
  if (hasTransferKeyword) {
    // User wants a human — disable AI and send fallback
    await disableConversationAI(conversationId)
    return { reply: config.fallback_message, usedFallback: true }
  }

  try {
    // ── 3. Embed the incoming message ────────────────────────────────────────────
    const embedding = await createEmbedding(incomingMessage)
    const embeddingStr = `[${embedding.join(',')}]`

    // ── 4. Retrieve relevant KB chunks via pgvector ──────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: kbChunks } = await (admin as any).rpc('match_documents', {
      query_embedding: embeddingStr,
      match_threshold: 0.65,
      match_count: 4,
      p_org_id: orgId,
      p_instance_id: instanceId,
    })

    const context = ((kbChunks as KBChunk[]) || [])
      .map(c => `[${c.title}]\n${c.content}`)
      .join('\n\n---\n\n')

    // ── 5. Fetch recent conversation history ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: history } = await (admin as any)
      .from('messages')
      .select('direction, content, sent_at')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(config.context_messages || 10)

    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = (
      ((history as any[]) || []).reverse()
    ).map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: m.content || '',
    }))

    // ── 6. Build the system prompt ───────────────────────────────────────────────
    const toneDescriptions: Record<string, string> = {
      professional: 'Eres un asistente profesional y formal.',
      friendly: 'Eres un asistente amigable y cercano, usa emojis ocasionalmente.',
      concise: 'Eres un asistente directo y conciso, evita respuestas largas.',
      formal: 'Eres extremadamente formal y diplomático.',
    }
    const toneInstruction = toneDescriptions[config.tone] || toneDescriptions['professional']

    const systemPromptParts = [
      toneInstruction,
      config.system_prompt || 'Ayuda a los clientes de manera útil y precisa.',
      context
        ? `\n\nUsa la siguiente información de nuestra base de conocimiento para responder:\n\n${context}`
        : '',
      `\n\nReglas IMPORTANTES:
- Si no sabes la respuesta con certeza, di que un agente te ayudará pronto.
- No inventes información que no esté en la base de conocimiento.
- Responde siempre en el idioma del cliente.
- Sé breve pero completo.`,
    ].join('\n')

    // ── 7. Call OpenAI Completions ───────────────────────────────────────────────
    const client = getOpenAI()
    const completion = await client.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      temperature: Number(config.temperature) || 0.7,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPromptParts },
        ...historyMessages,
        { role: 'user', content: incomingMessage },
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim() || null

    if (!reply) {
      // Empty response — use fallback
      await disableConversationAI(conversationId)
      return { reply: config.fallback_message, usedFallback: true }
    }

    return { reply, usedFallback: false }
  } catch (error) {
    console.error('[RAG] Error generating AI response:', error)
    // On error, send fallback and disable AI for this chat
    await disableConversationAI(conversationId)
    return { reply: config.fallback_message, usedFallback: true }
  }
}

/**
 * Disable AI for a specific conversation so a human agent can take over.
 */
export async function disableConversationAI(conversationId: string): Promise<void> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('conversations')
    .update({ is_ai_active: false, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

/**
 * Save the AI response as a message in the DB and send via Evolution API.
 */
export async function saveAndSendAIMessage({
  conversationId,
  orgId,
  contactPhone,
  replyText,
}: {
  conversationId: string
  orgId: string
  contactPhone: string
  replyText: string
}): Promise<void> {
  const admin = createAdminClient()

  // 1. Save in DB as 'ai' direction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('messages').insert({
    conversation_id: conversationId,
    org_id: orgId,
    direction: 'ai',
    content: replyText,
    message_type: 'text',
    status: 'sent',
    sent_at: new Date().toISOString(),
  })

  // 2. Send via WhatsApp (Evolution API)
  try {
    await evolutionClient.sendTextMessage(orgId, contactPhone, replyText)
  } catch (err) {
    console.error('[RAG] Failed to send AI message via Evolution:', err)
  }

  // 3. Update conversation last message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_preview: `🤖 ${replyText.substring(0, 47)}`,
  }).eq('id', conversationId)
}

export async function saveAndSendMediaMessage({
  conversationId,
  orgId,
  contactPhone,
  mediaUrl,
  caption,
  mediaType = 'image'
}: {
  conversationId: string
  orgId: string
  contactPhone: string
  mediaUrl: string
  caption?: string
  mediaType?: 'image' | 'video' | 'document' | 'audio'
}): Promise<void> {
  const admin = createAdminClient()

  const textContent = caption || '[Media]'

  // 1. Save in DB
  await (admin as any).from('messages').insert({
    conversation_id: conversationId,
    org_id: orgId,
    direction: 'ai',
    content: textContent,
    message_type: mediaType,
    media_url: mediaUrl,
    status: 'sent',
    sent_at: new Date().toISOString(),
  })

  // 2. Send via WhatsApp (Evolution API)
  try {
    await evolutionClient.sendMedia(orgId, contactPhone, mediaUrl, mediaType, caption)
  } catch (err) {
    console.error('[RAG] Failed to send Media message via Evolution:', err)
  }

  // 3. Update conversation last message
  await (admin as any).from('conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_preview: `🤖 📎 Adjunto`,
  }).eq('id', conversationId)
}
