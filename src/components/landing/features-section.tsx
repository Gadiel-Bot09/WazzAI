'use client'

import { motion } from 'framer-motion'
import { Bot, Kanban, LayoutDashboard, Zap, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: <Bot className="w-8 h-8 text-purple-500" />,
    title: 'Inteligencia Artificial (RAG)',
    description: 'Respuestas automáticas basadas en tu propia base de conocimiento. La IA entiende tu negocio y atiende a tus clientes 24/7.',
    color: 'bg-purple-500/10 border-purple-500/20'
  },
  {
    icon: <Kanban className="w-8 h-8 text-blue-500" />,
    title: 'Kanban CRM Integrado',
    description: 'Gestiona tus prospectos visualmente. Arrastra y suelta chats entre diferentes etapas de tu embudo de ventas.',
    color: 'bg-blue-500/10 border-blue-500/20'
  },
  {
    icon: <Zap className="w-8 h-8 text-emerald-500" />,
    title: 'Automatización WhatsApp',
    description: 'Conectado nativamente a la API de Evolution. Mensajes, respuestas y asignaciones instantáneas y sin demoras.',
    color: 'bg-emerald-500/10 border-emerald-500/20'
  },
  {
    icon: <LayoutDashboard className="w-8 h-8 text-amber-500" />,
    title: 'Analíticas en Tiempo Real',
    description: 'Mide tu rendimiento. Visualiza el crecimiento de tus leads, tiempos de respuesta y contactos más activos.',
    color: 'bg-amber-500/10 border-amber-500/20'
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-rose-500" />,
    title: 'Arquitectura B2B',
    description: 'Multi-tenant seguro. Cada organización tiene sus propios datos, agentes y configuraciones completamente aisladas.',
    color: 'bg-rose-500/10 border-rose-500/20'
  },
  {
    icon: <Users className="w-8 h-8 text-cyan-500" />,
    title: 'Multi-Agente',
    description: 'Asigna conversaciones a diferentes miembros de tu equipo o deja que la IA tome el control inicial.',
    color: 'bg-cyan-500/10 border-cyan-500/20'
  }
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export function FeaturesSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas para escalar</h2>
          <p className="text-muted-foreground text-lg">
            No es solo un bot de WhatsApp. Es una plataforma completa de gestión de clientes diseñada para multiplicar tus ventas.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={item}>
              <Card className={`h-full border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all hover:-translate-y-1 ${feature.color}`}>
                <CardContent className="p-6">
                  <div className="mb-4 inline-block p-3 rounded-2xl bg-background shadow-sm border border-border/50">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
