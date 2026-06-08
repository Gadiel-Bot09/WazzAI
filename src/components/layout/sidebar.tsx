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
  FileText,
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
    label: 'Reportes',
    href: '/dashboard/reports',
    icon: FileText,
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

export function Sidebar({ 
  isPlatformAdmin = false,
  permissions = {},
  isOwner = false,
  orgName = 'WazzAI'
}: { 
  isPlatformAdmin?: boolean,
  permissions?: Record<string, boolean>,
  isOwner?: boolean,
  orgName?: string
}) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  // Helper to check if a menu item should be shown
  const canAccess = (href: string) => {
    if (isOwner || permissions.all || isPlatformAdmin) return true

    if (href === '/dashboard/chat') return permissions.can_reply_chat || permissions.can_view_all_chats
    if (href === '/dashboard/contacts') return permissions.can_manage_contacts
    if (href === '/dashboard/kanban') return permissions.can_manage_contacts
    if (href === '/dashboard/whatsapp') return permissions.can_manage_settings
    if (href === '/dashboard/analytics') return permissions.can_view_analytics
    if (href === '/dashboard/reports') return permissions.can_view_analytics
    if (href === '/dashboard/analytics/surveys') return permissions.can_view_analytics
    if (href === '/dashboard/automations') return permissions.can_manage_automations
    if (href === '/dashboard/ai-settings') return permissions.can_manage_settings
    
    // Config items
    if (href.startsWith('/dashboard/settings')) {
      return permissions.can_manage_settings || permissions.can_manage_team || permissions.can_manage_departments
    }

    // Allow everything else by default or restrict as needed
    return true
  }

  const filteredNavItems = navItems.filter(item => canAccess(item.href))
  const filteredBottomItems = bottomItems.filter(item => canAccess(item.href))

  return (
    <aside className="w-64 border-r bg-background h-screen flex flex-col hidden md:flex shadow-sm">
      {/* Logo & Org Name */}
      <div className="h-16 flex items-center border-b px-5 hover:bg-muted/30 transition-colors">
        <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl truncate">
          <Logo />
          <span className="text-foreground tracking-tight truncate">
            {orgName}
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto py-4 flex flex-col">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">Principal</p>
          <nav className="grid gap-0.5">
            {filteredNavItems.map(item => {
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

        {/* Settings & Admin */}
        <div className="mt-auto px-3 pb-2 border-t pt-4">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">Configuración</p>
          <nav className="grid gap-0.5">
            {filteredBottomItems.map(item => {
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
