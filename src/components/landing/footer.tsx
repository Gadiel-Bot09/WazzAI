import Link from 'next/link'
import { Bot } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-muted/10 py-12 md:py-16 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">WazzAI</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              La plataforma definitiva para automatizar y escalar la gestión de clientes en WhatsApp mediante Inteligencia Artificial.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Producto</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground transition-colors">Características</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground transition-colors">Precios</Link></li>
              <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Iniciar Sesión</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Documentación</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Casos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Términos de Servicio</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacidad</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Contacto</Link></li>
            </ul>
          </div>

        </div>
        
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} WazzAI. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
