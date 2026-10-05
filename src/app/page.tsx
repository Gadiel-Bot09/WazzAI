import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { Footer } from '@/components/landing/footer'
import Link from 'next/link'
import { Logo } from '@/components/layout/logo'

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
          <Logo className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight hidden sm:block">WazzAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Características</Link>
          <Link href="#contact" className="hover:text-foreground transition-colors">Contacto</Link>
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
        
        <section id="contact" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Contáctanos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
              ¿Estás listo para automatizar tus ventas o tienes alguna duda? Nuestro equipo está aquí para ayudarte.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <a href="mailto:info@sinuhub.com" className="flex items-center gap-4 px-8 py-5 bg-background border rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-muted-foreground">Envíanos un correo</p>
                  <p className="text-lg font-bold">info@sinuhub.com</p>
                </div>
              </a>
              
              <a href="https://wa.me/573007393692" target="_blank" rel="noreferrer" className="flex items-center gap-4 px-8 py-5 bg-background border rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-muted-foreground">Escríbenos por WhatsApp</p>
                  <p className="text-lg font-bold">300 739 3692</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
