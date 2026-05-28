'use client'

import { useState } from 'react'
import { updateOrgProfileAction, OrgProfile } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Globe, CheckCircle, AlertCircle } from 'lucide-react'

const TIMEZONES = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Caracas',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Asuncion',
  'America/Montevideo',
  'America/Panama',
  'America/Costa_Rica',
  'America/Guatemala',
  'America/El_Salvador',
  'America/Tegucigalpa',
  'America/Managua',
  'America/Santo_Domingo',
  'America/Havana',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
]

interface OrgProfileFormProps {
  initialData: OrgProfile
}

export function OrgProfileForm({ initialData }: OrgProfileFormProps) {
  const [name, setName] = useState(initialData.name)
  const [timezone, setTimezone] = useState(initialData.timezone || 'America/Bogota')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const res = await updateOrgProfileAction({ name, timezone })
    if (res.success) {
      setMessage({ type: 'success', text: '¡Perfil de empresa actualizado exitosamente!' })
    } else {
      setMessage({ type: 'error', text: res.error })
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {message.text}
        </div>
      )}

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="org-name" className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Nombre de la empresa
          </Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi Empresa S.A.S"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-timezone" className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Zona horaria
          </Label>
          <select
            id="org-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Identificador único (slug)</Label>
          <div className="flex h-10 w-full rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground items-center">
            {initialData.slug}
          </div>
          <p className="text-xs text-muted-foreground">El slug no puede modificarse después de la creación.</p>
        </div>
      </div>

      <Button type="submit" isLoading={isLoading}>
        Guardar cambios
      </Button>
    </form>
  )
}
