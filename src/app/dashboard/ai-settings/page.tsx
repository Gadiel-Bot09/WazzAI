import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAIConfigAction, getKnowledgeDocsAction } from '@/actions/ai'
import { AISettingsClient } from '@/components/ai/ai-settings-client'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Configuración de IA | WazzAI',
}

async function AISettingsData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get user's org and their whatsapp instance
  const { data: profileData } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.org_id) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Completa el onboarding para acceder a la configuración de IA.
      </div>
    )
  }

  // Get first instance for this org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: instanceData } = await (supabase as any)
    .from('whatsapp_instances')
    .select('id')
    .eq('org_id', profile.org_id)
    .single()

  const instance = instanceData as any

  if (!instance?.id) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h2 className="font-semibold text-lg mb-2">Conecta una instancia de WhatsApp primero</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Ve a la sección de WhatsApp, conecta una cuenta y luego podrás configurar la IA.
        </p>
      </div>
    )
  }

  // Fetch AI config and knowledge base docs
  const [configRes, docsRes] = await Promise.all([
    getAIConfigAction(instance.id),
    getKnowledgeDocsAction(),
  ])

  return (
    <AISettingsClient
      instanceId={instance.id}
      initialConfig={configRes.success ? configRes.data : null}
      initialDocs={docsRes.success ? docsRes.data : []}
    />
  )
}

export default function AISettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <AISettingsData />
      </Suspense>
    </div>
  )
}
