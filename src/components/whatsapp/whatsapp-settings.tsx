'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateWhatsAppSettingsAction } from '@/actions/whatsapp'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export function WhatsAppSettingsForm({ initialIgnoreGroups }: { initialIgnoreGroups: boolean }) {
  const [ignore, setIgnore] = useState(initialIgnoreGroups)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleChange(checked: boolean) {
    setIgnore(checked)
    setLoading(true)
    setFeedback(null)
    const res = await updateWhatsAppSettingsAction(checked)
    setLoading(false)
    if (res.success) {
      setFeedback({ type: 'success', text: 'Configuración guardada' })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ type: 'error', text: res.error ?? 'Error al guardar' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="ignore-groups" className="text-base">Ignorar mensajes de grupos</Label>
          <p className="text-sm text-muted-foreground">
            Si está activado, los mensajes provenientes de grupos de WhatsApp serán ignorados y no crearán conversaciones ni aparecerán en el chat en vivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <Switch
            id="ignore-groups"
            checked={ignore}
            onCheckedChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>
      
      {feedback && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-md ${
          feedback.type === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.text}
        </div>
      )}
    </div>
  )
}
