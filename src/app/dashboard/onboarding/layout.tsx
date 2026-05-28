import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Si el usuario ya completó el onboarding, redirigirlo al dashboard principal
  if (user.user_metadata?.onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border flex items-center px-6">
        <h1 className="text-xl font-bold gradient-text">WazzAI</h1>
      </header>
      
      <main className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>
    </div>
  )
}
