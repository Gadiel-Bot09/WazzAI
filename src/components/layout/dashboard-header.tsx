"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from 'lucide-react'
import { Sidebar } from "./sidebar"

interface DashboardHeaderProps {
  orgName: string
  isPlatformAdmin: boolean
  permissions: Record<string, boolean>
  isOwner: boolean
}

export function DashboardHeader({ 
  orgName, 
  isPlatformAdmin, 
  permissions, 
  isOwner 
}: DashboardHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 bg-white/70 dark:bg-background/70 backdrop-blur-xl border-b z-10">
      <div className="absolute inset-x-0 top-0 h-[3px] brand-gradient-animated" />

      <div className="flex items-center gap-3 animate-wz-fade-up">
        {/* Mobile menu trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-xl hover:bg-muted text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0 bg-transparent shadow-none" hideClose={true}>
            <Sidebar 
              isPlatformAdmin={isPlatformAdmin} 
              permissions={permissions} 
              isOwner={isOwner} 
              orgName={orgName}
              isMobile={true}
              onClose={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="relative hidden sm:flex">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl brand-gradient-animated text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
            {orgName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -top-1 -right-1 text-[11px] animate-wz-sparkle" aria-hidden>✨</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground tracking-tight leading-none">{orgName}</span>
          <span className="text-[11px] font-semibold mt-1 uppercase tracking-wider brand-text">Espacio de trabajo</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 animate-wz-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-wz-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="hidden sm:inline">IA activa</span>
          <span className="inline sm:hidden">IA</span>
        </div>
      </div>
    </header>
  )
}
