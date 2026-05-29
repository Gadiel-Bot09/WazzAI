'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLeadAction } from '@/actions/kanban'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
  columns: { id: string; name: string; color: string }[]
}

export function NewLeadModal({ open, onClose, columns }: NewLeadModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const res = await createLeadAction({
      title: fd.get('title') as string,
      column_id: fd.get('column_id') as string,
      contact_name: fd.get('contact_name') as string,
      contact_phone: fd.get('contact_phone') as string,
      notes: fd.get('notes') as string,
    })

    if (res.success) {
      router.refresh()
      onClose()
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogDescription>
            Crea un lead manualmente. Puedes asociarlo a un contacto de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título del lead *</Label>
            <Input id="title" name="title" placeholder="Ej. Interesado en Plan Pro" required disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="column_id">Columna</Label>
            <select
              id="column_id"
              name="column_id"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nombre del contacto</Label>
              <Input id="contact_name" name="contact_name" placeholder="Juan Pérez" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Teléfono (WhatsApp)</Label>
              <Input id="contact_phone" name="contact_phone" placeholder="+57300..." disabled={loading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Información relevante..."
              rows={3}
              disabled={loading}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
