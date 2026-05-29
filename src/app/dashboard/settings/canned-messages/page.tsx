'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCannedMessagesAction,
  createCannedMessageAction,
  updateCannedMessageAction,
  deleteCannedMessageAction,
} from '@/actions/chat'
import type { CannedMessage } from '@/actions/chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, Zap, MessageSquareText } from 'lucide-react'

type FormData = { title: string; content: string; shortcut: string }
const EMPTY_FORM: FormData = { title: '', content: '', shortcut: '' }

export default function CannedMessagesPage() {
  const [messages, setMessages] = useState<CannedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CannedMessage | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CannedMessage | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getCannedMessagesAction()
    setLoading(false)
    if (res.success) setMessages(res.data)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(msg: CannedMessage) {
    setEditing(msg)
    setForm({ title: msg.title, content: msg.content, shortcut: msg.shortcut ?? '' })
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      setFormError('Título y contenido son obligatorios')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = { title: form.title, content: form.content, shortcut: form.shortcut || undefined }
    const res = editing
      ? await updateCannedMessageAction(editing.id, payload)
      : await createCannedMessageAction(payload)
    setSaving(false)
    if (!res.success) { setFormError(res.error ?? 'Error'); return }
    setFormOpen(false)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteCannedMessageAction(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquareText className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Mensajes predefinidos</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Crea atajos de respuesta. Escribe <code className="bg-muted px-1 py-0.5 rounded text-xs">/</code> en el chat para buscarlos.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo mensaje
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border rounded-xl bg-muted/20">
          <Zap className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">Sin mensajes predefinidos</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Crea respuestas rápidas para agilizar la atención al cliente.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Crear primer mensaje
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden divide-y">
          {messages.map(msg => (
            <div key={msg.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{msg.title}</span>
                  {msg.shortcut && (
                    <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                      /{msg.shortcut}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(msg)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(msg)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={open => !open && setFormOpen(false)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar mensaje predefinido' : 'Nuevo mensaje predefinido'}</DialogTitle>
            <DialogDescription>
              Define el título, el texto completo y opcionalmente un atajo corto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cm-title">Título *</Label>
              <Input
                id="cm-title"
                placeholder="Ej. Saludo inicial"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cm-shortcut">
                Atajo{' '}
                <span className="text-muted-foreground font-normal text-xs">(opcional — sin el /)</span>
              </Label>
              <Input
                id="cm-shortcut"
                placeholder="Ej. saludo"
                value={form.shortcut}
                onChange={e => setForm(f => ({ ...f, shortcut: e.target.value.replace(/\s/g, '') }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cm-content">Contenido *</Label>
              <Textarea
                id="cm-content"
                placeholder="Escribe el texto que se insertará en el chat..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear mensaje'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteTarget?.title}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
