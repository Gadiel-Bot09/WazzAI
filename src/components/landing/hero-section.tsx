'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Bot, MessageSquare, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-32 sm:pt-32 sm:pb-40">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background"></div>
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-40 blur-[100px] bg-purple-500/30 w-[600px] h-[600px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 opacity-30 blur-[120px] bg-emerald-500/30 w-[500px] h-[500px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[120px] bg-blue-500/20 w-[800px] h-[400px] rounded-full mix-blend-screen pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/50 backdrop-blur-md text-sm font-medium text-muted-foreground"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            Plataforma B2B Multi-tenant
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight"
          >
            Automatiza tu WhatsApp con{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600">
              Inteligencia Artificial
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Convierte conversaciones en ventas. Gestiona tus prospectos con nuestro CRM visual, atiende 24/7 con IA que conoce tu negocio, y escala tu soporte sin esfuerzo.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/auth/register">
              <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)] transition-all">
                Comienza Gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base font-semibold border-border/50 bg-background/50 backdrop-blur hover:bg-muted/50">
                Iniciar Sesión
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="pt-16 sm:pt-24"
          >
            {/* Dashboard Mockup - Abstract representation */}
            <div className="relative mx-auto w-full max-w-5xl rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl p-2 sm:p-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-1/2 bottom-0"></div>
              
              <div className="rounded-xl border border-border/50 bg-background/80 overflow-hidden shadow-inner flex flex-col h-[300px] sm:h-[500px]">
                {/* Fake Header */}
                <div className="h-12 border-b flex items-center px-4 gap-4 bg-muted/20">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="h-6 w-48 bg-muted/50 rounded-md mx-auto"></div>
                </div>
                {/* Fake Content */}
                <div className="flex-1 flex p-4 gap-4">
                  {/* Fake Sidebar */}
                  <div className="w-48 hidden sm:flex flex-col gap-2 border-r pr-4">
                    <div className="h-8 bg-muted/50 rounded-md w-full"></div>
                    <div className="h-8 bg-muted/30 rounded-md w-3/4"></div>
                    <div className="h-8 bg-muted/30 rounded-md w-5/6"></div>
                  </div>
                  {/* Fake Main Area */}
                  <div className="flex-1 flex gap-4">
                    {/* Chat list */}
                    <div className="w-1/3 hidden md:flex flex-col gap-3">
                      <div className="h-16 bg-muted/40 rounded-lg flex items-center p-3 gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20"></div>
                        <div className="flex-1 space-y-2"><div className="h-3 bg-muted/60 rounded w-1/2"></div><div className="h-2 bg-muted/40 rounded w-3/4"></div></div>
                      </div>
                      <div className="h-16 bg-muted/20 rounded-lg flex items-center p-3 gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20"></div>
                        <div className="flex-1 space-y-2"><div className="h-3 bg-muted/50 rounded w-2/3"></div><div className="h-2 bg-muted/30 rounded w-1/2"></div></div>
                      </div>
                    </div>
                    {/* Active Chat */}
                    <div className="flex-1 border border-border/50 rounded-lg bg-card flex flex-col overflow-hidden relative">
                       <div className="h-14 border-b flex items-center px-4"><div className="h-4 bg-muted/50 rounded w-1/4"></div></div>
                       <div className="flex-1 p-4 space-y-4">
                         <div className="flex gap-2">
                           <div className="w-8 h-8 rounded-full bg-muted/50"></div>
                           <div className="h-12 bg-muted/30 rounded-2xl rounded-tl-sm w-1/2"></div>
                         </div>
                         <div className="flex gap-2 justify-end">
                           <div className="h-16 bg-emerald-500/20 rounded-2xl rounded-tr-sm w-2/3 border border-emerald-500/30"></div>
                           <div className="w-8 h-8 rounded-full bg-emerald-500/40 flex items-center justify-center">
                             <Bot className="w-4 h-4 text-emerald-400" />
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
