import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/sidebar'
import { SubscriptionGuard } from '@/components/layout/subscription-guard'
import { RealtimeListener } from '@/components/chat/realtime-listener'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }
  console.log('Fetching layout for user:', user.id)

  // Verificar si completó el onboarding
  const adminSupabase = createAdminClient() as any
  const { data: profileData } = await adminSupabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as any

  if (!profile?.org_id) {
    redirect('/onboarding')
  }

  const onboardingCompleted = user.user_metadata?.onboarding_completed === true

  if (!onboardingCompleted) {
    // handled by middleware
  }

  // Fetch permissions for the Sidebar
  let permissions: Record<string, boolean> = {}
  let isOwner = false
  let orgName = 'WazzAI'

  if (profile?.org_id) {
    // Get org name
    const { data } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single()
    const orgData = data as any
    if (orgData?.name) orgName = orgData.name

    // Get permissions using admin client to bypass RLS on roles table
    const { data: teamData } = await adminSupabase
      .from('team_members')
      .select('roles(permissions)')
      .eq('user_id', user.id)
      .eq('org_id', profile.org_id)
      .single()

    const teamMember = teamData as any
    let roleData = teamMember?.roles as any
    if (Array.isArray(roleData)) {
      roleData = roleData[0]
    }

    if (profile.role === 'owner') {
      isOwner = true
      permissions = { all: true }
    } else if (!roleData || !roleData.permissions) {
      isOwner = false
      permissions = {}
    } else {
      let perms = roleData.permissions
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms) } catch(e) { perms = {} }
      }
      permissions = perms || {}
    }
  }

  const isPlatformAdmin = user.app_metadata?.platform_admin === true

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {profile?.org_id && <RealtimeListener orgId={profile.org_id} currentUser={profile} />}
      <Sidebar isPlatformAdmin={isPlatformAdmin} permissions={permissions} isOwner={isOwner} orgName={orgName} />
      <main className="flex-1 flex flex-col min-w-0 content-mesh relative h-screen">
        {/* Professional Top Header */}
        <header className="relative h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white/70 dark:bg-background/70 backdrop-blur-xl border-b z-10">
          {/* Línea de acento con gradiente animado de la marca */}
          <div className="absolute inset-x-0 top-0 h-[3px] brand-gradient-animated" />

          <div className="flex items-center gap-3 animate-wz-fade-up">
            <div className="relative">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl brand-gradient-animated text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
                {orgName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -top-1 -right-1 text-[11px] animate-wz-sparkle" aria-hidden>✨</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-tight leading-none">{orgName}</span>
              <span className="text-[11px] font-semibold mt-1 uppercase tracking-wider brand-text">Espacio de trabajo</span>
            </div>
          </div>
          <div className="flex items-center gap-4 animate-wz-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-wz-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              IA activa
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <SubscriptionGuard>
            {children}
          </SubscriptionGuard>
        </div>
      </main>
    </div>
  )
}
