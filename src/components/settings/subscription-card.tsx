'use client'

import { MessageCircle, Calendar, Clock, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SubscriptionStatus } from '@/actions/settings'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface SubscriptionCardProps {
  data: SubscriptionStatus
}

const STATUS_CONFIG = {
  active: {
    label: 'Activa',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    icon: CheckCircle,
  },
  trialing: {
    label: 'Periodo de prueba',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: Clock,
  },
  past_due: {
    label: 'Vencida',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: AlertTriangle,
  },
  canceled: {
    label: 'Cancelada',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: AlertTriangle,
  },
  unpaid: {
    label: 'Sin pago',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: AlertTriangle,
  },
}

export function SubscriptionCard({ data }: SubscriptionCardProps) {
  const config = STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unpaid
  const StatusIcon = config.icon

  const isBlocked = ['past_due', 'canceled', 'unpaid'].includes(data.status) ||
    (data.status === 'trialing' && data.days_left === 0)

  function handleContactSupport() {
    const text = encodeURIComponent(data.support_message)
    const phone = data.support_whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${config.bg}`}>
        <StatusIcon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />
        <div>
          <p className={`font-semibold text-sm ${config.color}`}>{config.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plan: <span className="font-medium capitalize">{data.plan_name}</span>
          </p>
        </div>
      </div>

      {/* Trial Info */}
      {data.status === 'trialing' && data.trial_end && (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Periodo de prueba</p>
            <p className="text-sm text-muted-foreground">
              {data.days_left > 0
                ? <>Te quedan <span className="font-bold text-foreground">{data.days_left} días</span> de prueba gratuita.</>
                : 'Tu periodo de prueba ha finalizado.'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Vence {formatDistanceToNow(parseISO(data.trial_end), { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>
      )}

      {/* Active info */}
      {data.status === 'active' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
          <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Licencia activa</p>
            <p className="text-sm text-muted-foreground">
              Tu licencia ha sido activada manualmente por el equipo de WazzAI. Tienes acceso completo a todas las funcionalidades.
            </p>
          </div>
        </div>
      )}

      {/* Org ID */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">ID de tu organización</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border font-mono text-xs break-all">
          {data.org_id}
        </div>
        <p className="text-xs text-muted-foreground">
          Comparte este ID con el equipo de soporte para activar o renovar tu licencia.
        </p>
      </div>

      {/* Contact CTA */}
      <div className="space-y-3 pt-2 border-t">
        <div>
          <p className="text-sm font-medium">
            {isBlocked ? '¿Necesitas activar tu licencia?' : '¿Tienes preguntas sobre tu suscripción?'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Contacta a nuestro equipo por WhatsApp para activar, renovar o resolver cualquier duda sobre tu plan.
          </p>
        </div>
        <Button
          onClick={handleContactSupport}
          className="bg-[#25D366] hover:bg-[#128C7E] text-white w-full sm:w-auto"
          size="lg"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Contactar por WhatsApp
        </Button>
      </div>
    </div>
  )
}
