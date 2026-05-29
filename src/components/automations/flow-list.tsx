'use client'

import { useState } from 'react'
import { AutomationFlow, createFlowAction, deleteFlowAction, updateFlowAction } from '@/actions/automations'
import { Button } from '@/components/ui/button'
import { Plus, Workflow, Trash2, Edit2, Loader2, MessageSquare, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'

interface FlowListProps {
  initialFlows: AutomationFlow[]
}

export function FlowList({ initialFlows }: FlowListProps) {
  const [flows, setFlows] = useState(initialFlows)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCreate() {
    setLoading(true)
    const res = await createFlowAction({ name: 'Nuevo Flujo de Automatización' })
    if (res.success) {
      router.push(`/dashboard/automations/${res.data.id}`)
    } else {
      alert(res.error)
      setLoading(false)
    }
  }

  async function handleToggle(flow: AutomationFlow) {
    const res = await updateFlowAction(flow.id, { is_active: !flow.is_active })
    if (res.success) {
      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, is_active: res.data.is_active } : f))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este flujo? Esta acción no se puede deshacer.')) return
    const res = await deleteFlowAction(id)
    if (res.success) {
      setFlows(prev => prev.filter(f => f.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Tus Flujos ({flows.length})</h2>
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Crear Flujo
        </Button>
      </div>

      {flows.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Workflow className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No hay automatizaciones</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Los flujos visuales te permiten construir bots interactivos, recolectar datos y derivar chats a humanos.
          </p>
          <Button onClick={handleCreate} disabled={loading}>Comenzar a automatizar</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map(flow => (
            <div key={flow.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{flow.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{flow.description || 'Sin descripción'}</p>
                  </div>
                </div>
                <Switch 
                  checked={flow.is_active}
                  onCheckedChange={() => handleToggle(flow)}
                  title={flow.is_active ? 'Desactivar flujo' : 'Activar flujo'}
                />
              </div>

              <div className="flex-1 mt-2 mb-4">
                <div className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  {flow.trigger_type === 'welcome' ? (
                    <><MessageSquare className="w-3 h-3" /> Bienvenida</>
                  ) : flow.trigger_type === 'keyword' ? (
                    <><KeyRound className="w-3 h-3" /> Palabras Clave</>
                  ) : (
                    <><Workflow className="w-3 h-3" /> Múltiple</>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => router.push(`/dashboard/automations/${flow.id}`)}>
                  <Edit2 className="w-3.5 h-3.5 mr-2" />
                  Editar
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(flow.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
