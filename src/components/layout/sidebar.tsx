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
import { motion } from 'framer-motion'

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
  orgName = 'WazzAI',
  isMobile = false,
  onClose,
}: { 
  isPlatformAdmin?: boolean,
  permissions?: Record<string, boolean>,
  isOwner?: boolean,
  orgName?: string,
  isMobile?: boolean,
  onClose?: () => void
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

  // Solo un item activo a la vez (el de ruta más específica) para que el indicador animado no se duplique
  const allHrefs = [...filteredNavItems, ...filteredBottomItems].map(i => i.href)
  const activeHref = allHrefs
    .filter(h => isActive(h))
    .sort((a, b) => b.length - a.length)[0]

  const renderItem = (item: typeof navItems[number], index: number, keyPrefix: string) => {
    const active = item.href === activeHref
    return (
      <Link
        key={`${keyPrefix}-${item.href}-${item.label}`}
        href={item.href}
        onClick={() => {
          if (isMobile && onClose) {
            onClose()
          }
        }}
        style={{ animationDelay: `${index * 35}ms` }}
        className={`animate-wz-fade-up relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 group ${
          active ? 'text-white' : 'text-slate-400 hover:text-white'
        }`}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-xl brand-gradient shadow-[0_8px_24px_-8px_rgba(16,185,129,0.65)]"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
        {!active && (
          <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.06] transition-colors duration-200" />
        )}
        <span
          className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 ${
            active
              ? 'bg-white/20'
              : 'bg-white/[0.04] group-hover:bg-gradient-to-br group-hover:from-emerald-500/30 group-hover:to-blue-500/30 group-hover:scale-110'
          }`}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
        </span>
        <span className="relative z-10 flex-1 truncate transition-transform duration-200 group-hover:translate-x-0.5">
          {item.label}
        </span>
        {active && <ChevronRight className="relative z-10 h-3.5 w-3.5 text-white/80" />}
      </Link>
    )
  }

  return (
    <aside className={`sidebar-aurora relative h-screen flex-col shadow-xl overflow-hidden ${isMobile ? 'w-full flex' : 'w-64 hidden md:flex'}`}>
      {/* Orbes decorativos animados */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl animate-wz-float" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl animate-wz-float" style={{ animationDelay: '-3s' }} />

      {/* Logo & Org Name */}
      <div className="relative h-16 flex items-center border-b border-white/10 px-5">
        <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl truncate group">
          <span className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Logo className="relative w-8 h-8 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110" />
          </span>
          <span className="text-white tracking-tight truncate">
            {orgName}
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="relative flex-1 overflow-auto py-4 flex flex-col no-scrollbar">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold text-emerald-300/70 uppercase tracking-[0.18em] px-2 mb-2">Principal</p>
          <nav className="grid gap-1">
            {filteredNavItems.map((item, i) => renderItem(item, i, 'main'))}
          </nav>
        </div>

        {/* Settings & Admin */}
        <div className="mt-auto px-3 pb-3 border-t border-white/10 pt-4">
          <p className="text-[10px] font-semibold text-blue-300/70 uppercase tracking-[0.18em] px-2 mb-2">Configuración</p>
          <nav className="grid gap-1">
            {filteredBottomItems.map((item, i) => renderItem(item, i + filteredNavItems.length, 'bottom'))}

            {/* Admin Panel Link */}
            {isPlatformAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 mt-2"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/10">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                </span>
                <span>Panel Admin</span>
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={async () => {
                const { logoutAction } = await import('@/actions/auth')
                await logoutAction()
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-rose-300 hover:text-white hover:bg-rose-500/80 mt-2"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 group-hover:bg-white/20 transition-colors">
                <LogOut className="h-4 w-4 flex-shrink-0 transition-transform group-hover:-translate-x-0.5" />
              </span>
              <span>Cerrar sesión</span>
            </button>
          </nav>
        </div>
      </div>
    </aside>
  )
}
