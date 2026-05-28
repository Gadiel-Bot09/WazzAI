import { Suspense } from 'react'
import { getBillingInfoAction } from '@/actions/billing'
import { BillingClient } from '@/components/billing/billing-client'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Facturación y Límites | WazzAI',
}

async function BillingDataFetcher() {
  const res = await getBillingInfoAction()
  
  if (!res.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
        <p>No se pudo cargar la información de facturación.</p>
        <p className="text-sm mt-2">{res.error}</p>
      </div>
    )
  }

  if (!res.data) return null

  return <BillingClient billingInfo={res.data} />
}

export default function BillingPage() {
  return (
    <div className="flex flex-col h-full bg-background rounded-tl-2xl overflow-hidden border-t border-l">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-6 shrink-0 bg-background">
        <div>
          <h1 className="font-semibold">Facturación y Límites</h1>
          <p className="text-xs text-muted-foreground">Gestiona tu suscripción y consulta tus límites</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }>
          <BillingDataFetcher />
        </Suspense>
      </div>
    </div>
  )
}
