'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginAction, signInWithGoogleAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(searchParams.get('error'))
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const res = await loginAction({ email, password })
    
    if (res.success) {
      router.push(res.data.redirectTo)
    } else {
      setError(res.error)
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

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h2>
        <p className="text-sm text-muted-foreground">Ingresa a tu cuenta para continuar</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="nombre@empresa.com" 
            required 
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            disabled={isLoading}
          />
        </div>
        
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Iniciar sesión
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
        {/* Google icon simple SVG */}
        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </svg>
        Google
      </Button>

      <p className="px-8 text-center text-sm text-muted-foreground">
        ¿No tienes una cuenta?{' '}
        <Link href="/auth/register" className="text-primary hover:underline font-medium">
          Regístrate
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8 text-muted-foreground">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
