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
    .select('onboarding_completed, org_id')
    .eq('id', user.id)
    .single()
    
  const profile = profileData as any

  if (profile && !profile.onboarding_completed) {
    // Evitar loop infinito si ya estamos en /dashboard/onboarding
    // Check handled typically in middleware or by layout wrapper. 
    // For now, we will assume middleware handles /onboarding routing properly, or we can just render.
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {profile?.org_id && <RealtimeListener orgId={profile.org_id} />}
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-muted/10 relative h-screen">
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
      </main>
    </div>
  )
}
