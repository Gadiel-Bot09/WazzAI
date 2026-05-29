'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { createEmbedding, chunkText } from '@/lib/ai/embeddings'

// ─── Helper to get current user's org ────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profileData } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()
  return (profileData as any)?.org_id ?? null
}

// ─── AI Config Actions ────────────────────────────────────────────────────────

export async function getAIConfigAction(instanceId: string): Promise<ActionResult<any>> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ai_configs')
    .select('*')
    .eq('instance_id', instanceId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return err('Error al obtener la configuración de IA')
  }

  return ok(data)
}

export async function updateAIConfigAction(
  instanceId: string,
  updates: {
    model?: string
    tone?: string
    system_prompt?: string
    welcome_message?: string
    fallback_message?: string
    temperature?: number
    context_messages?: number
    transfer_keywords?: string[]
    is_active?: boolean
  }
): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()

  // Check if config exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('ai_configs')
    .select('id')
    .eq('instance_id', instanceId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((existing as any)?.id) {
    // Update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('ai_configs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('instance_id', instanceId)
    if (error) return err('Error al actualizar la configuración')
  } else {
    // Create
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('ai_configs')
      .insert({
        instance_id: instanceId,
        org_id: orgId,
        ...updates,
      })
    if (error) return err('Error al crear la configuración de IA')
  }

  return ok(undefined)
}

export async function toggleAIActiveAction(instanceId: string, isActive: boolean): Promise<ActionResult<void>> {
  return updateAIConfigAction(instanceId, { is_active: isActive })
}

// ─── Knowledge Base Actions ───────────────────────────────────────────────────

export async function getKnowledgeDocsAction(): Promise<ActionResult<any[]>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('knowledge_base')
    .select('id, title, source_filename, chunk_index, total_chunks, is_active, created_at')
    .eq('org_id', orgId)
    .eq('chunk_index', 0)            // Only show the first chunk (parent doc)
    .order('created_at', { ascending: false })

  if (error) return err('Error al obtener los documentos')
  return ok(data || [])
}

export async function addKnowledgeDocumentAction(
  title: string,
  content: string,
  instanceId?: string,
  sourceFilename?: string,
): Promise<ActionResult<{ chunksCreated: number }>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  if (!title.trim() || !content.trim()) {
    return err('El título y el contenido son obligatorios')
  }

  // 1. Chunk the text
  const chunks = chunkText(content)
  if (!chunks.length) return err('El contenido está vacío')

  const admin = createAdminClient()

  // 2. Generate embeddings and insert each chunk
  const insertPromises = chunks.map(async (chunk, idx) => {
    const embedding = await createEmbedding(chunk)
    const embeddingStr = `[${embedding.join(',')}]`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (admin as any).from('knowledge_base').insert({
      org_id: orgId,
      instance_id: instanceId || null,
      title: title,
      content: chunk,
      embedding: embeddingStr,
      source_filename: sourceFilename || null,
      chunk_index: idx,
      total_chunks: chunks.length,
      is_active: true,
    })
  })

  try {
    const results = await Promise.all(insertPromises)
    const firstError = results.find((r: any) => r.error)
    if (firstError?.error) {
      console.error('[KB] Insert error:', firstError.error)
      return err('Error al guardar el documento en la base de conocimiento')
    }
    return ok({ chunksCreated: chunks.length })
  } catch (e) {
    console.error('[KB] Embedding error:', e)
    return err('Error al generar los embeddings del documento. Verifique su API key de OpenAI.')
  }
}

export async function deleteKnowledgeDocumentAction(title: string): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('knowledge_base')
    .delete()
    .eq('org_id', orgId)
    .eq('title', title)

  if (error) return err('Error al eliminar el documento')
  return ok(undefined)
}

export async function toggleConversationAIAction(
  conversationId: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('conversations')
    .update({ is_ai_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) return err('Error al cambiar el estado de IA de la conversación')
  return ok(undefined)
}
