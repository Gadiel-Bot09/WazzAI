/**
 * Supabase Admin Client (Service Role)
 * ⚠️  NEVER use in Client Components or expose to browser
 * Use ONLY in:
 *  - Server Actions that need to bypass RLS
 *  - Webhook handlers
 *  - Cron jobs
 *  - Admin operations
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/env'

// Singleton to avoid creating multiple clients
let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function createAdminClient() {
  if (adminClient) return adminClient

  adminClient = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return adminClient
}
