'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registerAction, signInWithGoogleAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirm_password = formData.get('confirm_password') as string
    const full_name = formData.get('full_name') as string
    
    const res = await registerAction({ email, password, confirm_password, full_name, org_name: 'Temp' })
    
    if (res.success) {
      setSuccess(true)
    } else {
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors)
      } else {
        setError(res.error)
      }
      setIsLoading(false)
    }
  }

  async function onGoogleSignIn() {
    setIsLoading(true)
    const res = await signInWithGoogleAction()
    if (res.success) {
      window.location.href = res.data.url
    } else {
      setError(res.error)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">¡Revisa tu correo!</h2>
        <p className="text-sm text-muted-foreground">
          Hemos enviado un enlace de confirmación a tu correo electrónico. Haz clic en el enlace para activar tu cuenta.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Volver al inicio de sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Crear cuenta</h2>
        <p className="text-sm text-muted-foreground">Ingresa tus datos para empezar</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input 
            id="full_name" 
            name="full_name" 
            placeholder="Juan Pérez" 
            required 
            disabled={isLoading}
            error={fieldErrors.full_name?.[0]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="nombre@empresa.com" 
            required 
            disabled={isLoading}
            error={fieldErrors.email?.[0]}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
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
          Registrarse
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">O continúa con</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        type="button" 
        onClick={onGoogleSignIn} 
        disabled={isLoading}
        className="w-full"
      >
        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </svg>
        Google
      </Button>

      <p className="px-8 text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
