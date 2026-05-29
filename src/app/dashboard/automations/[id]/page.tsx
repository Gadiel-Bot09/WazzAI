import { Suspense } from 'react'
import { getFlowAction } from '@/actions/automations'
import { FlowBuilder } from '@/components/automations/flow-builder'
import { Loader2 } from 'lucide-react'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Constructor de Flujo | WazzAI',
}

interface PageProps {
  params: Promise<{ id: string }>
}

async function FlowFetcher({ id }: { id: string }) {
  const res = await getFlowAction(id)
  
  if (!res.success) {
    if (res.error === 'Flujo no encontrado') notFound()
    return <div className="p-8 text-center text-red-500">{res.error}</div>
  }

  return <FlowBuilder initialData={res.data} />
}

export default async function AutomationBuilderPage({ params }: PageProps) {
  const resolvedParams = await params
  
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <FlowFetcher id={resolvedParams.id} />
      </Suspense>
    </div>
  )
}
