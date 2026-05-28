import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WhatsAppConnectionStatus } from '@/components/whatsapp/qr-scanner'
import { Smartphone, Loader2, Info } from 'lucide-react'

export const metadata = {
  title: 'WhatsApp | WazzAI',
}

type WaTab = 'conexion' | 'info'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const WA_TABS: { id: WaTab; label: string; icon: any }[] = [
  { id: 'conexion', label: 'Conexión', icon: Smartphone },
  { id: 'info', label: 'Información', icon: Info },
]

async function getOrgData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  return { orgId: profile?.active_organization_id ?? null }
}

export default async function WhatsAppPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const currentTab: WaTab = (resolvedParams.tab as WaTab) || 'conexion'
  const { orgId } = await getOrgData()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#25D366]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-4 ml-12">
            Conecta y gestiona tu número de WhatsApp con la plataforma.
          </p>

          {/* Tabs */}
          <nav className="flex gap-1 -mb-px">
            {WA_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id
              return (
                <a
                  key={tab.id}
                  href={`/dashboard/whatsapp?tab=${tab.id}`}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#25D366] text-[#25D366]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {!orgId ? (
            <div className="bg-card rounded-xl border shadow-sm p-8 text-center">
              <p className="text-muted-foreground text-sm">
                Completa el proceso de configuración inicial para conectar WhatsApp.
              </p>
            </div>
          ) : currentTab === 'conexion' ? (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="font-semibold text-lg">Estado de conexión</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escanea el código QR para vincular tu número de WhatsApp Business.
                </p>
              </div>
              <Suspense fallback={
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              }>
                <WhatsAppConnectionStatus orgId={orgId} />
              </Suspense>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
              <div>
                <h2 className="font-semibold text-lg mb-1">¿Cómo funciona la integración?</h2>
                <p className="text-sm text-muted-foreground">
                  WazzAI utiliza Evolution API v2 para conectarse a WhatsApp de forma directa y segura.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: 'Conexión por QR',
                    desc: 'Vincula tu número escaneando el código QR desde WhatsApp en tu teléfono. No necesitas número de desarrollador.',
                  },
                  {
                    title: 'Mensajes en tiempo real',
                    desc: 'Todos los mensajes entrantes se reciben al instante vía webhook y se procesan por la IA configurada.',
                  },
                  {
                    title: 'IA por conversación',
                    desc: 'Puedes activar o desactivar la respuesta automática de IA en cada chat de forma independiente.',
                  },
                  {
                    title: 'Privacidad y seguridad',
                    desc: 'Tu sesión de WhatsApp se almacena de forma encriptada en tu instancia de Evolution API.',
                  },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-xl bg-muted/40 border space-y-2">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
                <strong>Nota:</strong> Mantén tu teléfono conectado a internet para que la sesión de WhatsApp permanezca activa. Si tu teléfono pierde conexión por más de 14 días, deberás volver a escanear el QR.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
