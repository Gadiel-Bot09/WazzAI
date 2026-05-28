'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BillingInfo } from '@/actions/billing'
import { MessageCircle, CreditCard, ShieldCheck, Zap, Activity } from 'lucide-react'
import { isPast, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

export function BillingClient({ billingInfo }: { billingInfo: BillingInfo }) {
  const isTrial = billingInfo.status === 'trialing'
  const trialExpired = isTrial && billingInfo.trialEnd && isPast(parseISO(billingInfo.trialEnd))
  
  const handleSupportClick = () => {
    const text = encodeURIComponent(billingInfo.supportContact.message_template)
    const phone = billingInfo.supportContact.whatsapp_number.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  const getStatusBadge = () => {
    if (billingInfo.status === 'active') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Activa</Badge>
    if (billingInfo.status === 'trialing' && !trialExpired) return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">En Trial</Badge>
    if (billingInfo.status === 'past_due' || trialExpired) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Expirada / Vencida</Badge>
    return <Badge variant="outline">{billingInfo.status}</Badge>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Resumen del Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tu Plan Actual</CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold">{billingInfo.planName}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Suscripción administrada manualmente.
              </p>
            </div>

            {isTrial && billingInfo.trialEnd && !trialExpired && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 rounded-lg text-sm flex items-start gap-2 border border-amber-200 dark:border-amber-800">
                <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Periodo de Prueba</p>
                  <p>Tu prueba finaliza el {format(parseISO(billingInfo.trialEnd), "d 'de' MMMM, yyyy", { locale: es })}.</p>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">¿Necesitas renovar o cambiar de plan?</p>
              <Button onClick={handleSupportClick} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contactar a Soporte (WhatsApp)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Límites de Uso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Límites del Plan</CardTitle>
            <CardDescription>Capacidades incluidas en tu licencia actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(billingInfo.limits).map(([key, value]) => {
              const formatKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              const formatValue = (v: number) => v === -1 ? 'Ilimitado' : v.toLocaleString()
              
              let Icon = Zap
              if (key.includes('message')) Icon = MessageCircle
              if (key.includes('operator') || key.includes('user')) Icon = ShieldCheck
              if (key.includes('instance')) Icon = CreditCard
              
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{formatKey(key)}</span>
                  </div>
                  <span className="font-mono text-sm">{formatValue(value)}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
