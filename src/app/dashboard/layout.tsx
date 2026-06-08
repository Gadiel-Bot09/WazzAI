import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  // Verificar si completó el onboarding
  const { data: profileData } = await supabase
    .from('users')
    .select('org_id, role, department_id')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as any
  const onboardingCompleted = user.user_metadata?.onboarding_completed === true

  if (!onboardingCompleted) {
    // handled by middleware
  }

  // Fetch permissions for the Sidebar
  let permissions: Record<string, boolean> = {}
  let isOwner = false

  if (profile?.org_id) {
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('roles(permissions)')
      .eq('user_id', user.id)
      .eq('org_id', profile.org_id)
      .single()

    const roleData = teamMember?.roles as any
    if (!roleData) {
      // Owner or no role assigned
      isOwner = true
      permissions = { all: true }
    } else {
      permissions = roleData.permissions || {}
    }
  }

  const isPlatformAdmin = user.app_metadata?.platform_admin === true

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {profile?.org_id && <RealtimeListener orgId={profile.org_id} currentUser={profile} />}
      <Sidebar isPlatformAdmin={isPlatformAdmin} permissions={permissions} isOwner={isOwner} />
      <main className="flex-1 flex flex-col min-w-0 bg-muted/10 relative h-screen">
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
      </main>
    </div>
  )
}
