'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    
    const res = await forgotPasswordAction({ email })
    
    if (res.success) {
      setSuccess(true)
    } else {
      setError(res.error)
    }
    
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="flex flex-col space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h2>
        <p className="text-sm text-muted-foreground">
          Si el correo está registrado, te hemos enviado instrucciones para restablecer tu contraseña.
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
        <h2 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo y te enviaremos un enlace para restablecerla
        </p>
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
        
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Enviar instrucciones
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
