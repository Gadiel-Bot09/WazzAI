'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { resetPasswordAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    // Al instanciar el cliente, este lee el fragmento #access_token de la URL (si venimos de una invitación)
    // y lo guarda en las cookies para que el Server Action tenga la sesión activa.
    createClient().auth.getSession()
  }, [])
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})
    
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm_password = formData.get('confirm_password') as string
    
    const res = await resetPasswordAction({ password, confirm_password })
    
    if (res.success) {
      setSuccess(true)
    } else {
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors)
      } else {
        setError(res.error)
      }
    }
    
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="flex flex-col space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Contraseña actualizada</h2>
        <p className="text-sm text-muted-foreground">
          Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Iniciar sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Crear nueva contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa tu nueva contraseña a continuación
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            disabled={isLoading}
            error={fieldErrors.password?.[0]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar contraseña</Label>
          <Input 
            id="confirm_password" 
            name="confirm_password" 
            type="password" 
            required 
            disabled={isLoading}
            error={fieldErrors.confirm_password?.[0]}
          />
        </div>
        
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Guardar contraseña
        </Button>
      </form>
    </div>
  )
}
