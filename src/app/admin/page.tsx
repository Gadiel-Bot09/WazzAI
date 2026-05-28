import { Suspense } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import {
  getPlatformStatsAction,
  getAllOrgsAction,
  getAllPlansAction,
  getPlatformSettingsAction,
} from '@/actions/admin'
import { AdminPanelClient } from '@/components/admin/admin-panel-client'

export const metadata = {
  title: 'Admin Panel | WazzAI',
}

async function AdminDataFetcher() {
  const [statsRes, orgsRes, plansRes, settingsRes] = await Promise.all([
    getPlatformStatsAction(),
    getAllOrgsAction(),
    getAllPlansAction(),
    getPlatformSettingsAction(),
  ])

  if (!statsRes.success || !orgsRes.success || !plansRes.success || !settingsRes.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error de Carga</h1>
        <p className="text-muted-foreground max-w-md text-center">
          No se pudieron cargar los datos del panel de administración.
        </p>
      </div>
    )
  }

  return (
    <AdminPanelClient
      stats={statsRes.data}
      orgs={orgsRes.data}
      plans={plansRes.data}
      initialSettings={settingsRes.data}
    />
  )
}

export default function AdminPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-sm">Cargando panel de administración...</p>
          </div>
        </div>
      }>
        <AdminDataFetcher />
      </Suspense>
    </div>
  )
}
