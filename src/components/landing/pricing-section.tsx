import { createClient } from '@/lib/supabase/server'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export async function PricingSection() {
  const supabase = await createClient()
  
  // Fetch active plans from db
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  if (!plans || plans.length === 0) {
    return null
  }

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes diseñados para tu crecimiento</h2>
          <p className="text-muted-foreground text-lg">
            Comienza gratis con 14 días de prueba. Sin tarjeta de crédito requerida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {plans.map((plan: any, i: number) => {
            const isPopular = i === 1 // highlight middle plan by default
            
            return (
              <div 
                key={plan.id}
                className={`relative rounded-3xl border p-8 flex flex-col bg-card ${
                  isPopular 
                    ? 'border-primary/50 shadow-[0_0_30px_rgba(37,211,102,0.15)] ring-1 ring-primary/20 scale-105 z-10' 
                    : 'border-border/60 hover:border-primary/30 transition-colors'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Más Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold">{plan.display_name}</h3>
                  <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                    ${plan.price_monthly}
                    <span className="ml-1 text-xl font-medium text-muted-foreground">/mes</span>
                  </div>
                </div>

                <ul className="mb-8 space-y-4 flex-1">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="font-semibold">{plan.limits?.messages_per_month || 'Ilimitado'}</strong> Mensajes/mes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="font-semibold">{plan.limits?.operators || 1}</strong> Operadores</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="font-semibold">{plan.limits?.knowledge_base_docs || 0}</strong> Documentos de IA</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="font-semibold">{plan.limits?.instances || 1}</strong> Instancias WhatsApp</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{plan.trial_days || 14} días de prueba gratis</span>
                  </li>
                </ul>

                <Link href="/auth/register" className="w-full">
                  <Button 
                    className={`w-full h-12 rounded-xl font-semibold ${isPopular ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                  >
                    Comenzar Ahora
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
