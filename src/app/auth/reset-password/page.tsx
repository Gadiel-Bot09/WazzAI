'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  useEffect(() => {
    const supabase = createClient()
    
    const initializeSession = async () => {
      // 1. Manually parse hash if present (fixes issues with SSR PKCE strictness)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          // Clear hash to prevent leaking tokens
          window.history.replaceState(null, '', window.location.pathname)
        }
      }

      // 2. Check resulting session
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        if (hash.includes('error_description')) {
          const params = new URLSearchParams(hash.substring(1))
          const errDesc = params.get('error_description')
          if (errDesc?.includes('expired') || errDesc?.includes('invalid')) {
            setError('El enlace de invitación ha expirado o ya fue utilizado. Pídele al administrador que te envíe una nueva invitación.')
          } else {
            setError(`Error de autenticación: ${errDesc}`)
          }
        }
      }
    }
    
    initializeSession()
  }, [])
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})
    
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm_password = formData.get('confirm_password') as string
    
    if (password !== confirm_password) {
      setFieldErrors({ confirm_password: ['Las contraseñas no coinciden'] })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setFieldErrors({ password: ['La contraseña debe tener al menos 6 caracteres'] })
      setIsLoading(false)
      return
    }
    
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    
    if (!updateError) {
      setSuccess(true)
      // Redirigir al inicio después de unos segundos
      setTimeout(() => router.push('/dashboard'), 3000)
    } else {
      console.error('Update password error:', updateError)
      if (updateError.message.includes('Auth session missing')) {
        setError('No tienes una sesión activa. Asegúrate de haber hecho clic en un enlace de invitación reciente y válido.')
      } else {
        setError(`Error al restablecer: ${updateError.message}`)
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
          Tu contraseña ha sido establecida exitosamente. Redirigiendo a tu cuenta...
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Ir al Dashboard</Link>
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

      <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground border">
        <strong>Condiciones de la contraseña:</strong>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Debe tener al menos 6 caracteres de longitud.</li>
          <li>Se recomienda incluir letras, números y algún símbolo para mayor seguridad.</li>
        </ul>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative">
            <Input 
              id="password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              required 
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar contraseña</Label>
          <div className="relative">
            <Input 
              id="confirm_password" 
              name="confirm_password" 
              type={showPassword ? "text" : "password"} 
              required 
              disabled={isLoading}
              className="pr-10"
            />
          </div>
          {fieldErrors.confirm_password && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm_password[0]}</p>}
        </div>
        
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Guardar contraseña
        </Button>
      </form>
    </div>
  )
}
