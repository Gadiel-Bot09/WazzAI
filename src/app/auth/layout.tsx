import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <div className="w-full max-w-md p-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">WazzAI</h1>
          <p className="text-muted-foreground mt-2">La plataforma IA para tu WhatsApp</p>
        </div>
        
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl overflow-hidden p-8">
          {children}
        </div>
      </div>
    </main>
  )
}
