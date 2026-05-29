'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnAction, updateColumnAction, deleteColumnAction } from '@/actions/kanban'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Trash2, Plus, Loader2, GripVertical } from 'lucide-react'

interface ManageColumnsModalProps {
  open: boolean
  onClose: () => void
  columns: { id: string; name: string; color: string }[]
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#14b8a6', '#6366f1',
  '#64748b', '#0ea5e9',
]

export function ManageColumnsModal({ open, onClose, columns }: ManageColumnsModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null) // id of column being edited
  const [error, setError] = useState<string | null>(null)

  // New column form state
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [creatingNew, setCreatingNew] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreatingNew(true)
    setError(null)
    const res = await createColumnAction({ name: newName.trim(), color: newColor })
    if (res.success) {
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      router.refresh()
    } else {
      setError(res.error)
    }
    setCreatingNew(false)
  }

  async function handleDelete(columnId: string) {
    if (!confirm('¿Eliminar esta columna? Los leads se moverán a la primera columna disponible.')) return
    setLoading(columnId)
    setError(null)
    const res = await deleteColumnAction(columnId)
    if (res.success) {
      router.refresh()
    } else {
      setError(res.error)
    }
    setLoading(null)
  }

  async function handleRename(columnId: string, name: string) {
    setLoading(columnId)
    await updateColumnAction(columnId, { name })
    setLoading(null)
    router.refresh()
  }

  async function handleColorChange(columnId: string, color: string) {
    setLoading(columnId)
    await updateColumnAction(columnId, { color })
    setLoading(null)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Columnas</DialogTitle>
          <DialogDescription>
            Administra las columnas de tu tablero Kanban.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
            {error}
          </div>
        )}

        {/* Existing columns */}
        <div className="space-y-2">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />

              {/* Color picker inline */}
              <div className="flex gap-1 flex-shrink-0">
                {PRESET_COLORS.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(col.id, c)}
                    className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${col.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Name */}
              <input
                className="flex-1 bg-transparent border-b border-transparent focus:border-primary focus:outline-none text-sm py-0.5"
                defaultValue={col.name}
                onBlur={(e) => {
                  if (e.target.value !== col.name) handleRename(col.id, e.target.value)
                }}
                disabled={loading === col.id}
              />

              {loading === col.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                onClick={() => handleDelete(col.id)}
                disabled={!!loading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* New column form */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium">Agregar nueva columna</p>
          <div className="space-y-2">
            <Label htmlFor="new-col-name">Nombre</Label>
            <Input
              id="new-col-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Seguimiento"
              disabled={creatingNew}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${newColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || creatingNew}
            className="w-full"
            variant="outline"
          >
            {creatingNew ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Agregar columna
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
