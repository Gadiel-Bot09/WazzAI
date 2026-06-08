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
      <main className="flex-1 flex flex-col min-w-0 bg-muted/10 relative h-screen">
        {/* Professional Top Header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md border-b z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold shadow-sm border border-primary/10">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-tight leading-none">{orgName}</span>
              <span className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Espacio de trabajo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Future items like notifications or user profile menu can go here */}
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
