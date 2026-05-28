'use client'

import { useState } from 'react'
import { updateAccountAction, updatePasswordAction, AccountProfile } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react'

interface AccountFormProps {
  initialData: AccountProfile
}

export function AccountForm({ initialData }: AccountFormProps) {
  const [fullName, setFullName] = useState(initialData.full_name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoadingName, setIsLoadingName] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const roleLabels: Record<string, string> = {
    superadmin: 'Super Administrador',
    owner: 'Propietario',
    admin: 'Administrador',
    agent: 'Agente',
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoadingName(true)
    setNameMessage(null)
    const res = await updateAccountAction({ full_name: fullName })
    setNameMessage(res.success
      ? { type: 'success', text: 'Nombre actualizado exitosamente' }
      : { type: 'error', text: res.error }
    )
    setIsLoadingName(false)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoadingPassword(true)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      setIsLoadingPassword(false)
      return
    }

    const res = await updatePasswordAction(newPassword)
    if (res.success) {
      setPasswordMessage({ type: 'success', text: '¡Contraseña cambiada exitosamente!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPasswordMessage({ type: 'error', text: res.error })
    }
    setIsLoadingPassword(false)
  }

  return (
    <div className="space-y-8">
      {/* Datos personales */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <User className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Datos personales</h3>
        </div>

        <div className="space-y-1 rounded-lg bg-muted/30 border px-4 py-3">
          <p className="text-xs text-muted-foreground">Correo electrónico</p>
          <p className="text-sm font-medium">{initialData.email}</p>
        </div>

        <div className="space-y-1 rounded-lg bg-muted/30 border px-4 py-3">
          <p className="text-xs text-muted-foreground">Rol en la plataforma</p>
          <p className="text-sm font-medium">{roleLabels[initialData.role] ?? initialData.role}</p>
        </div>

        <form onSubmit={handleNameSubmit} className="space-y-4">
          {nameMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              nameMessage.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}>
              {nameMessage.type === 'success'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {nameMessage.text}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
              disabled={isLoadingName}
            />
          </div>
          <Button type="submit" size="sm" isLoading={isLoadingName}>
            Actualizar nombre
          </Button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Lock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Cambiar contraseña</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              passwordMessage.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}>
              {passwordMessage.type === 'success'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {passwordMessage.text}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={isLoadingPassword}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu nueva contraseña"
              disabled={isLoadingPassword}
              required
            />
          </div>
          <Button type="submit" size="sm" isLoading={isLoadingPassword}>
            Cambiar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
