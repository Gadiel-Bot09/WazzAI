import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getOrgProfileAction,
  getAccountProfileAction,
  getSubscriptionStatusAction,
  getTeamMembersAction,
} from '@/actions/settings'
import { OrgProfileForm } from '@/components/settings/org-profile-form'
import { AccountForm } from '@/components/settings/account-form'
import { SubscriptionCard } from '@/components/settings/subscription-card'
import { TeamList } from '@/components/settings/team-list'
import { Building2, User, CreditCard, Users, Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Configuración | WazzAI',
}

type Tab = 'empresa' | 'cuenta' | 'suscripcion' | 'equipo'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'empresa', label: 'Mi Empresa', icon: Building2 },
  { id: 'cuenta', label: 'Mi Cuenta', icon: User },
  { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
  { id: 'equipo', label: 'Equipo', icon: Users },
]

async function SettingsContent({ tab }: { tab: Tab }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (tab === 'empresa') {
    const res = await getOrgProfileAction()
    if (!res.success) {
      return <div className="text-red-500 text-sm p-4">{res.error}</div>
    }
    return <OrgProfileForm initialData={res.data} />
  }

  if (tab === 'cuenta') {
    const res = await getAccountProfileAction()
    if (!res.success) {
      return <div className="text-red-500 text-sm p-4">{res.error}</div>
    }
    return <AccountForm initialData={res.data} />
  }

  if (tab === 'suscripcion') {
    const res = await getSubscriptionStatusAction()
    if (!res.success) {
      return (
        <div className="p-6 text-center text-muted-foreground text-sm">
          No se encontró información de suscripción. Completa el proceso de bienvenida primero.
        </div>
      )
    }
    return <SubscriptionCard data={res.data} />
  }

  if (tab === 'equipo') {
    const res = await getTeamMembersAction()
    return <TeamList members={res.success ? res.data : []} />
  }

  return null
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const currentTab: Tab = (resolvedParams.tab as Tab) || 'empresa'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-0">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Configuración</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Administra tu empresa, cuenta, suscripción y equipo.
          </p>

          {/* Tabs */}
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id
              return (
                <a
                  key={tab.id}
                  href={`/dashboard/settings?tab=${tab.id}`}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <Suspense fallback={
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            }>
              <SettingsContent tab={currentTab} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
