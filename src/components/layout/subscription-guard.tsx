'use client'

import { useEffect, useState } from 'react'
import { getBillingInfoAction, BillingInfo } from '@/actions/billing'
import { isPast, parseISO } from 'date-fns'
import { AlertTriangle, MessageCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBillingInfoAction().then((res) => {
      if (res.success) {
        setBilling(res.data)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // I2-FIX: Si no hay billing data (nuevo usuario sin subscripción aún), mostrar trial banner
  // y dejar pasar — NO bloquear. El bloqueo solo aplica cuando hay una sub expirada/cancelada.
  if (!billing) {
    return (
      <>
        <div className="bg-amber-100 text-amber-900 px-4 py-2 text-sm flex items-center justify-center gap-2 font-medium z-50 shrink-0">
          <AlertCircle className="w-4 h-4" />
          Período de prueba activo — 14 días de acceso gratuito.
          <Link href="/dashboard/settings?tab=suscripcion" className="underline font-bold ml-2">Ver detalles</Link>
        </div>
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {children}
        </div>
      </>
    )
  }

  // Determine if blocked
  const isTrial = billing.status === 'trialing'
  const trialExpired = isTrial && billing.trialEnd && isPast(parseISO(billing.trialEnd))
  const isBlocked = billing.status === 'past_due' || billing.status === 'canceled' || trialExpired === true

  // Determine days left in trial
  const daysLeft = billing.trialEnd && isTrial 
    ? Math.max(0, Math.ceil((new Date(billing.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleSupportClick = () => {
    const text = encodeURIComponent(billing.supportContact.message_template)
    const phone = billing.supportContact.whatsapp_number.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  return (
    <>
      {/* Top Banner if in trial */}
      {isTrial && !isBlocked && (
        <div className="bg-amber-100 text-amber-900 px-4 py-2 text-sm flex items-center justify-center gap-2 font-medium z-50 shrink-0">
          <AlertCircle className="w-4 h-4" />
          Estás en un periodo de prueba. Te quedan {daysLeft} días de uso gratuito.
          <Link href="/dashboard/billing" className="underline font-bold ml-2">Ver detalles</Link>
        </div>
      )}

      {/* Blocked Overlay */}
      {isBlocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full shadow-2xl border-border/60">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Licencia Expirada</h2>
              <p className="text-muted-foreground mb-6">
                {trialExpired 
                  ? 'Tu periodo de prueba de 14 días ha finalizado.'
                  : 'Tu suscripción a WazzAI se encuentra suspendida o vencida.'}
                <br /><br />
                Para continuar utilizando la plataforma y acceder a todos tus mensajes, contacta a nuestro equipo de soporte para solicitar la activación de tu licencia.
              </p>
              
              <Button size="lg" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={handleSupportClick}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Contactar por WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content (blur if blocked) */}
      <div className={`flex flex-col flex-1 h-full overflow-hidden ${isBlocked ? 'filter blur-sm pointer-events-none' : ''}`}>
        {children}
      </div>
    </>
  )
}
