'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updatePlanAction, createPlanAction } from '@/actions/admin'
import type { AdminPlanRow } from '@/actions/admin'

interface PlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: AdminPlanRow | null
  onSuccess: () => void
}

export function PlanFormDialog({ open, onOpenChange, plan, onSuccess }: PlanFormDialogProps) {
  const isEditing = !!plan

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    price_monthly: plan?.price_monthly?.toString() || '0',
    price_yearly: plan?.price_yearly?.toString() || '0',
    trial_days: plan?.trial_days?.toString() || '14',
    is_active: plan ? plan.is_active : true,
    sort_order: plan?.sort_order?.toString() || '10',
    limit_operators: plan?.limits?.operators?.toString() || '2',
    limit_messages: plan?.limits?.messages_per_month?.toString() || '1000',
    limit_instances: plan?.limits?.instances?.toString() || '1',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const limits = {
        ...(plan?.limits || {}),
        operators: parseInt(formData.limit_operators) || 0,
        messages_per_month: parseInt(formData.limit_messages) || 0,
        instances: parseInt(formData.limit_instances) || 0,
      }

      if (isEditing && plan) {
        const res = await updatePlanAction(plan.id, {
          display_name: formData.display_name,
          price_monthly: parseFloat(formData.price_monthly) || 0,
          price_yearly: parseFloat(formData.price_yearly) || 0,
          trial_days: parseInt(formData.trial_days) || 0,
          is_active: formData.is_active,
          limits,
        })
        if (res.success) {
          toast.success('Plan actualizado correctamente')
          onSuccess()
        } else {
          toast.error(res.error)
        }
      } else {
        const res = await createPlanAction({
          name: formData.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.display_name,
          price_monthly: parseFloat(formData.price_monthly) || 0,
          price_yearly: parseFloat(formData.price_yearly) || 0,
          trial_days: parseInt(formData.trial_days) || 0,
          sort_order: parseInt(formData.sort_order) || 10,
          limits,
          features: [],
        })
        if (res.success) {
          toast.success('Plan creado correctamente')
          onSuccess()
        } else {
          toast.error(res.error)
        }
      }
    } catch (err) {
      toast.error('Error al guardar el plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
            <DialogDescription>
              Configura los detalles comerciales y los límites técnicos del plan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="name">Identificador (slug)</Label>
                <Input
                  id="name"
                  placeholder="ej. premium_v2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="display_name">Nombre Público</Label>
              <Input
                id="display_name"
                placeholder="ej. Plan Premium"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price_monthly">Precio Mensual (USD)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price_yearly">Precio Anual (USD)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  step="0.01"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="trial_days">Días de Prueba (Trial)</Label>
                <Input
                  id="trial_days"
                  type="number"
                  value={formData.trial_days}
                  onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border mt-2">
              <h4 className="font-semibold text-sm">Límites del Plan</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="limit_operators" className="text-xs text-muted-foreground">Operadores (Agentes)</Label>
                  <Input
                    id="limit_operators"
                    type="number"
                    value={formData.limit_operators}
                    onChange={(e) => setFormData({ ...formData, limit_operators: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="limit_instances" className="text-xs text-muted-foreground">Números WhatsApp</Label>
                  <Input
                    id="limit_instances"
                    type="number"
                    value={formData.limit_instances}
                    onChange={(e) => setFormData({ ...formData, limit_instances: e.target.value })}
                  />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="limit_messages" className="text-xs text-muted-foreground">Mensajes por Mes (-1 para Ilimitado)</Label>
                  <Input
                    id="limit_messages"
                    type="number"
                    value={formData.limit_messages}
                    onChange={(e) => setFormData({ ...formData, limit_messages: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                />
                <Label htmlFor="is_active">Plan Activo (Visible para nuevas asignaciones)</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
