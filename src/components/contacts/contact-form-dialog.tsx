'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, X, Tag } from 'lucide-react'
import { createContactAction, updateContactAction } from '@/actions/contacts'
import type { Contact } from '@/actions/contacts'

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null
  onSuccess: () => void
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  const isEdit = !!contact

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '')
      setPhone(contact?.phone_number ?? '')
      setEmail(contact?.email ?? '')
      setNotes(contact?.notes ?? '')
      setTags(contact?.tags ?? [])
      setTagInput('')
      setError(null)
    }
  }, [open, contact])

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Nombre y teléfono son obligatorios')
      return
    }
    setLoading(true)
    setError(null)

    const formData = {
      name: name.trim(),
      phone_number: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      tags,
    }

    const res = isEdit
      ? await updateContactAction(contact!.id, formData)
      : await createContactAction(formData)

    setLoading(false)

    if (!res.success) {
      setError(res.error ?? 'Error desconocido')
    } else {
      onSuccess()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información del contacto.'
              : 'Agrega un nuevo contacto manualmente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-name">Nombre *</Label>
            <Input
              id="contact-name"
              placeholder="Ej. Juan Pérez"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-phone">Teléfono *</Label>
            <Input
              id="contact-phone"
              placeholder="Ej. 573001234567 (con código de país)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={isEdit} // phone is the key, avoid changing it
              required
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                El número de teléfono no se puede modificar.
              </p>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-tags">Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                id="contact-tags"
                placeholder="Escribir y presionar Enter o Agregar"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-notes">Notas</Label>
            <Textarea
              id="contact-notes"
              placeholder="Información adicional sobre este contacto..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear contacto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
