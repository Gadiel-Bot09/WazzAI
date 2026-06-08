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
    .select('org_id, role, department_id')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as any

  if (!profile?.org_id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-900 p-4">
        <h1 className="text-2xl font-bold mb-4">Error Crítico: Perfil no encontrado</h1>
        <p>No se pudo cargar tu perfil de organización.</p>
        <p className="mt-2 text-sm opacity-70">
          User ID: {user?.id}
        </p>
        <p className="mt-2 text-sm opacity-70">
          Error DB: {profileError ? JSON.stringify(profileError) : 'Data es null'}
        </p>
        <p className="mt-2 text-sm opacity-70">
          Rol DB Key: {process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Presente' : 'Ausente'}
        </p>
      </div>
    )
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
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
      </main>
    </div>
  )
}
