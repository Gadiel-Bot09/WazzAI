'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageSquare,
  LayoutDashboard,
  Settings,
  Bot,
  Brain,
  BarChart3,
  ChevronRight,
  LogOut,
  ShieldAlert,
  Smartphone,
  Users,
  MessageSquareText,
  Star,
  Workflow,
  Building,
} from 'lucide-react'
import { Logo } from '@/components/layout/logo'

const navItems = [
  {
    label: 'Kanban de Leads',
    href: '/dashboard/kanban',
    icon: LayoutDashboard,
  },
  {
    label: 'Chat en Vivo',
    href: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    label: 'Contactos',
    href: '/dashboard/contacts',
    icon: Users,
  },
  {
    label: 'Configuración IA',
    href: '/dashboard/ai-settings',
    icon: Brain,
  },
  {
    label: 'WhatsApp',
    href: '/dashboard/whatsapp',
    icon: Smartphone,
  },
  {
    label: 'Analíticas',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    label: 'Encuestas',
    href: '/dashboard/analytics/surveys',
    icon: Star,
  },
  {
    label: 'Automatizaciones',
    href: '/dashboard/automations',
    icon: Workflow,
  },
  {
    label: 'Configuración de IA',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

const bottomItems = [
  {
    label: 'Departamentos',
    href: '/dashboard/settings/departments',
    icon: Building,
  },
  {
    label: 'Usuarios',
    href: '/dashboard/settings/team',
    icon: Users,
  },
  {
    label: 'Roles y Permisos',
    href: '/dashboard/settings/roles',
    icon: ShieldAlert,
  },
  {
    label: 'Mensajes predefinidos',
    href: '/dashboard/settings/canned-messages',
    icon: MessageSquareText,
  },
  {
    label: 'Configuración',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function Sidebar({ isPlatformAdmin = false }: { isPlatformAdmin?: boolean }) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 border-r bg-background h-screen flex flex-col hidden md:flex shadow-sm">
      {/* Logo */}
      <div className="h-16 flex items-center border-b px-5 hover:bg-muted/30 transition-colors">
        <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl">
          <Logo />
          <span className="text-foreground tracking-tight">
            WazzAI
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto py-4 flex flex-col">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">Principal</p>
          <nav className="grid gap-0.5">
            {navItems.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3 w-3 text-primary/50" />}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto px-3 pb-2 border-t pt-4">
          <nav className="grid gap-0.5">
            {bottomItems.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            {/* Admin Panel Link */}
            {isPlatformAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 mt-2"
              >
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>Panel Admin</span>
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={async () => {
                const { logoutAction } = await import('@/actions/auth')
                await logoutAction()
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-red-500 hover:text-red-600 hover:bg-red-500/10 mt-2"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </nav>
        </div>
      </div>
    </aside>
  )
}
