'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganizationAction, completeOnboardingAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, ChevronRight, MessageSquare, Bot, Users } from 'lucide-react'
import { QRScanner } from '@/components/whatsapp/qr-scanner'

// Pasos del onboarding
const STEPS = [
  { id: 1, title: 'Tu Empresa', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 2, title: 'WhatsApp', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 3, title: 'Inteligencia Artificial', icon: <Bot className="w-5 h-5" /> },
  { id: 4, title: 'Equipo', icon: <Users className="w-5 h-5" /> },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgData, setOrgData] = useState<{ id: string, slug: string } | null>(null)

  // Step 1: Create Organization
  async function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const org_name = formData.get('org_name') as string
    const timezone = formData.get('timezone') as string
    
    const res = await createOrganizationAction({ org_name, timezone })
    
    if (res.success) {
      setOrgData({ id: res.data.orgId, slug: res.data.orgSlug })
      setStep(2)
    } else {
      setError(res.error)
    }
    
    setIsLoading(false)
  }

  // Final Step: Complete Onboarding
  async function handleFinish() {
    setIsLoading(true)
    const res = await completeOnboardingAction()
    if (res.success) {
      router.push('/dashboard')
    } else {
      setError(res.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-300"
          style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        
        {STEPS.map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              step >= s.id 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'bg-card border-border text-muted-foreground'
            }`}>
              {s.icon}
            </div>
            <span className={`text-xs font-medium ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md text-center">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="mt-8">
        {step === 1 && (
          <Card className="border-border/50 shadow-lg">
            <form onSubmit={handleStep1}>
              <CardHeader>
                <CardTitle>Configura tu organización</CardTitle>
                <CardDescription>
                  Empecemos por darle un nombre a tu espacio de trabajo en WazzAI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org_name">Nombre de la empresa</Label>
                  <Input 
                    id="org_name" 
                    name="org_name" 
                    placeholder="Ej. Acme Corp" 
                    required 
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <select 
                    id="timezone"
                    name="timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
                  >
                    <option value="America/Mexico_City">America/Mexico_City</option>
                    <option value="America/Bogota">America/Bogota</option>
                    <option value="America/Lima">America/Lima</option>
                    <option value="America/Santiago">America/Santiago</option>
                    <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                    {/* Más opciones se pueden añadir aquí */}
                  </select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  Siguiente paso <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Conecta tu WhatsApp</CardTitle>
              <CardDescription>
                Escanea el código QR para vincular el número de tu negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <QRScanner onConnected={() => setStep(3)} />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={isLoading}>
                Atrás
              </Button>
              <Button onClick={() => setStep(3)}>
                Saltar por ahora <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Configura la IA</CardTitle>
              <CardDescription>
                Define cómo responderá la inteligencia artificial a tus clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="gpt-4o">GPT-4o (Recomendado - Rápido y preciso)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Económico)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tono de conversación</Label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                    <input type="radio" name="tone" value="professional" className="accent-primary" defaultChecked />
                    <span className="text-sm font-medium">Profesional</span>
                  </label>
                  <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                    <input type="radio" name="tone" value="friendly" className="accent-primary" />
                    <span className="text-sm font-medium">Amigable / Casual</span>
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={isLoading}>
                Atrás
              </Button>
              <Button onClick={() => setStep(4)}>
                Siguiente paso <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Invita a tu equipo</CardTitle>
              <CardDescription>
                Añade operadores para que te ayuden a gestionar los mensajes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Correos electrónicos (opcional)</Label>
                <Input placeholder="email1@empresa.com, email2@empresa.com" />
                <p className="text-xs text-muted-foreground mt-2">
                  Separa los correos con comas. Podrás gestionar los permisos más tarde.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)} disabled={isLoading}>
                Atrás
              </Button>
              <Button onClick={handleFinish} isLoading={isLoading}>
                Ir al Dashboard
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
