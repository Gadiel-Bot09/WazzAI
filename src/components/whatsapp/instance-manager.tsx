'use client'

import { useState, useEffect } from 'react'
import { getInstancesListAction, createWhatsAppInstanceAction } from '@/actions/whatsapp'
import { WhatsAppConnectionStatus } from '@/components/whatsapp/qr-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Smartphone, Settings2, Trash2 } from 'lucide-react'

export function InstanceManager() {
  const [instances, setInstances] = useState<{ id: string; name: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchInstances = async () => {
    setLoading(true)
    const res = await getInstancesListAction()
    if (res.success && res.data) {
      setInstances(res.data as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await createWhatsAppInstanceAction(newName.trim())
    setCreating(false)
    
    if (res.success) {
      setIsCreating(false)
      setNewName('')
      await fetchInstances()
      setSelectedInstanceId(res.data?.id || null)
    } else {
      alert(res.error)
    }
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  if (selectedInstanceId) {
    const instance = instances.find(i => i.id === selectedInstanceId)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedInstanceId(null)}>← Volver</Button>
            <h3 className="font-semibold text-lg">{instance?.name}</h3>
          </div>
          <div className="text-xs px-2 py-1 bg-muted rounded-md border">ID: {instance?.id.substring(0,8)}...</div>
        </div>
        <WhatsAppConnectionStatus instanceId={selectedInstanceId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Instancias de WhatsApp</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los números de WhatsApp conectados a tu empresa.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Instancia
        </Button>
      </div>

      {isCreating && (
        <div className="bg-muted/30 p-4 rounded-xl border space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1.5">
            <Label>Nombre de la instancia</Label>
            <Input 
              placeholder="Ej: Soporte Técnico, Ventas, etc." 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Este nombre te ayudará a identificarla al momento de crear flujos.</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Crear y Conectar'}
            </Button>
          </div>
        </div>
      )}

      {instances.length === 0 && !isCreating ? (
        <div className="text-center py-12 border rounded-xl bg-card border-dashed">
          <Smartphone className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium text-foreground">No hay instancias creadas</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Crea tu primera instancia para conectar un número de WhatsApp.
          </p>
          <Button onClick={() => setIsCreating(true)} variant="outline">Crear Instancia</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {instances.map(inst => (
            <div key={inst.id} className="p-4 rounded-xl border bg-card hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setSelectedInstanceId(inst.id)}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold truncate pr-2">{inst.name}</h4>
                <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${inst.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {inst.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">ID: {inst.id}</p>
              <Button variant="secondary" size="sm" className="w-full">
                <Settings2 className="w-3.5 h-3.5 mr-2" />
                Gestionar Conexión
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
