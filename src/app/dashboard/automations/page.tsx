import { Suspense } from 'react'
import { getFlowsAction } from '@/actions/automations'
import { FlowList } from '@/components/automations/flow-list'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Automatizaciones | WazzAI',
}

async function FlowsFetcher() {
  const res = await getFlowsAction()
  if (!res.success) {
    return <div className="p-8 text-center text-red-500">{res.error}</div>
  }

  return <FlowList initialFlows={res.data} />
}

export default function AutomationsPage() {
  return (
    <div className="flex flex-col h-full bg-background overflow-auto">
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Automatizaciones</h1>
          <p className="text-muted-foreground text-sm">
            Crea flujos de trabajo visuales para automatizar las interacciones de WhatsApp.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <Suspense fallback={<div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <FlowsFetcher />
        </Suspense>
      </div>
    </div>
  )
}
