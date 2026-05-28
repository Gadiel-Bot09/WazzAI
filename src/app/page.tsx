import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { Footer } from '@/components/landing/footer'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import { Suspense } from 'react'

export const metadata = {
  title: 'WazzAI | Automatiza WhatsApp con IA y CRM',
  description: 'Convierte tus chats en ventas. Plataforma B2B multi-tenant con ChatGPT, Kanban CRM y analíticas para WhatsApp.',
  openGraph: {
    title: 'WazzAI | WhatsApp AI Platform',
    description: 'Convierte tus chats en ventas. Gestión inteligente con IA.',
    type: 'website',
  }
}

function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">WazzAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Características</Link>
          <Link href="#pricing" className="hover:text-foreground transition-colors">Precios</Link>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </Link>
          <Link href="/auth/register" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors">
            Regístrate
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/30">
      <Navbar />
      
      <main className="flex-1">
        <HeroSection />
        
        <div id="features">
          <FeaturesSection />
        </div>
        
        <div id="pricing">
          <Suspense fallback={<div className="h-96 flex items-center justify-center text-muted-foreground">Cargando planes...</div>}>
            <PricingSection />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}
