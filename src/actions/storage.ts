'use server'

import { generateUploadUrl } from '@/lib/storage/minio'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { createClient } from '@/lib/supabase/server'

export async function getUploadUrlAction(fileName: string, fileType: string): Promise<ActionResult<{ uploadUrl: string, publicUrl: string, key: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return err('No autorizado')
    }

    const result = await generateUploadUrl(fileName, fileType)
    return ok(result)
  } catch (error: any) {
    console.error('Error in getUploadUrlAction:', error)
    return err(error.message || 'Error al generar URL de subida')
  }
}
