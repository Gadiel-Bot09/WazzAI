'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  ShieldOff,
  LayoutGrid,
  TrendingUp,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Activity,
  Settings,
  Key,
} from 'lucide-react'
import { suspendOrgAction, reactivateOrgAction, assignPlanToOrgAction, activateSubscriptionAction, updatePlatformSettingsAction, getAllPlansAction } from '@/actions/admin'
import type { PlatformStats, AdminOrgRow, AdminPlanRow } from '@/actions/admin'
import { PlanFormDialog } from './plan-form-dialog'
import { toast } from 'sonner'

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
}: {
  title: string
  value: string | number
  icon: any
  iconColor: string
  iconBg: string
  subtitle?: string
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/60 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function SubStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-xs">Sin suscripción</Badge>
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Activa', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    past_due: { label: 'Vencida', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    canceled: { label: 'Cancelada', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    paused: { label: 'Pausada', className: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
  }
  const cfg = map[status] ?? { label: status, className: '' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
}

// ─── Org Table ────────────────────────────────────────────────────────────────

function OrgTable({ orgs, plans, onRefresh }: { orgs: AdminOrgRow[], plans: AdminPlanRow[], onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [suspending, setSuspending] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [confirmSuspendId, setConfirmSuspendId] = useState<string | null>(null)
  const [assigningPlan, setAssigningPlan] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSuspend(orgId: string) {
    setSuspending(orgId)
    startTransition(async () => {
      const res = await suspendOrgAction(orgId, suspendReason || 'Suspendido por administrador')
      if (res.success) {
        onRefresh()
        setConfirmSuspendId(null)
        setSuspendReason('')
      }
      setSuspending(null)
    })
  }

  async function handleReactivate(orgId: string) {
    setSuspending(orgId)
    startTransition(async () => {
      const res = await reactivateOrgAction(orgId)
      if (res.success) onRefresh()
      setSuspending(null)
    })
  }

  async function handleAssignPlan(orgId: string) {
    if (!selectedPlan) return
    startTransition(async () => {
      const res = await assignPlanToOrgAction(orgId, selectedPlan)
      if (res.success) {
        onRefresh()
        setAssigningPlan(null)
        setSelectedPlan('')
        toast.success('Plan asignado correctamente')
      } else {
        toast.error(res.error || 'Error al asignar el plan')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Buscar organización..."
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organización</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Suscripción</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Usuarios</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Mensajes</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron organizaciones
                </td>
              </tr>
            ) : (
              filtered.map(org => (
                <>
                  <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">/{org.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {org.plan_name ?? 'Sin Plan'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <SubStatusBadge status={org.subscription_status} />
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="font-medium">{org.user_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="font-medium">{org.message_count.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      {org.is_suspended ? (
                        <span className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                          <ShieldOff className="w-3.5 h-3.5" /> Suspendida
                        </span>
                      ) : org.is_active ? (
                        <span className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Activa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAssigningPlan(assigningPlan === org.id ? null : org.id)}
                        >
                          Plan
                        </Button>
                        {org.is_suspended ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                            disabled={suspending === org.id}
                            onClick={() => handleReactivate(org.id)}
                          >
                            {suspending === org.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reactivar'}
                          </Button>
                        ) : (
                          <>
                            {org.subscription_status !== 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={async () => {
                                  startTransition(async () => {
                                    await activateSubscriptionAction(org.id)
                                    onRefresh()
                                  })
                                }}
                              >
                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Key className="w-3 h-3 mr-1"/>Activar Licencia</>}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => setConfirmSuspendId(confirmSuspendId === org.id ? null : org.id)}
                            >
                              Suspender
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Suspend confirm row */}
                  {confirmSuspendId === org.id && (
                    <tr key={`suspend-${org.id}`} className="bg-red-50 dark:bg-red-950/20">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                            Motivo de suspensión:
                          </p>
                          <Input
                            value={suspendReason}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSuspendReason(e.target.value)}
                            placeholder="Ej: Pago vencido, uso indebido..."
                            className="max-w-xs h-7 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={suspending === org.id}
                            onClick={() => handleSuspend(org.id)}
                          >
                            {suspending === org.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setConfirmSuspendId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Assign plan row */}
                  {assigningPlan === org.id && (
                    <tr key={`plan-${org.id}`} className="bg-blue-50 dark:bg-blue-950/20">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <LayoutGrid className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                            Asignar plan:
                          </p>
                          <select
                            className="border rounded-md text-sm px-2 py-1 bg-background h-7"
                            value={selectedPlan}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPlan(e.target.value)}
                          >
                            <option value="">Seleccionar plan...</option>
                            {plans.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.display_name} — ${p.price_monthly}/mes
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!selectedPlan || isPending}
                            onClick={() => handleAssignPlan(org.id)}
                          >
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Asignar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setAssigningPlan(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Plans Manager ────────────────────────────────────────────────────────────

function PlansManager({ plans, onRefresh }: { plans: AdminPlanRow[], onRefresh: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminPlanRow | null>(null)

  function handleCreate() {
    setEditingPlan(null)
    setDialogOpen(true)
  }

  function handleEdit(plan: AdminPlanRow) {
    setEditingPlan(plan)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate} className="h-9">
          Nuevo Plan
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map(plan => (
          <Card key={plan.id} className={`border-border/60 ${!plan.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plan.display_name}</CardTitle>
                <Badge variant={plan.is_active ? 'default' : 'outline'} className="text-xs">
                  {plan.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <CardDescription className="font-mono text-xs">{plan.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">${plan.price_monthly}</p>
                  <p className="text-xs text-muted-foreground">mensual</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">${plan.price_yearly}</p>
                  <p className="text-xs text-muted-foreground">anual</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Operadores</span>
                  <span className="font-medium font-mono">{plan.limits?.operators === -1 ? '∞' : (plan.limits?.operators ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Números WhatsApp</span>
                  <span className="font-medium font-mono">{plan.limits?.instances === -1 ? '∞' : (plan.limits?.instances ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mensajes / mes</span>
                  <span className="font-medium font-mono">{plan.limits?.messages_per_month === -1 ? '∞' : (plan.limits?.messages_per_month?.toLocaleString() ?? 0)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                <Clock className="w-3 h-3" />
                {plan.trial_days} días de prueba gratis
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleEdit(plan)}>
                  Editar Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        plan={editingPlan} 
        onSuccess={() => {
          setDialogOpen(false)
          onRefresh()
        }}
      />
    </div>
  )
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────

interface AdminPanelClientProps {
  stats: PlatformStats
  orgs: AdminOrgRow[]
  plans: AdminPlanRow[]
  initialSettings: any[]
}

export function AdminPanelClient({ stats: initialStats, orgs: initialOrgs, plans: initialPlans, initialSettings }: AdminPanelClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'orgs' | 'plans' | 'settings'>('overview')
  const [orgs, setOrgs] = useState(initialOrgs)
  const [plans, setPlans] = useState(initialPlans)
  
  // Settings state
  const supportSetting = initialSettings.find(s => s.key === 'support_contact')?.value || { whatsapp_number: '', message_template: '' }
  const [waNumber, setWaNumber] = useState(supportSetting.whatsapp_number)
  const [waMsg, setWaMsg] = useState(supportSetting.message_template)
  const [savingSettings, setSavingSettings] = useState(false)

  async function handleRefresh() {
    // Re-fetch orgs and plans after mutations
    const { getAllOrgsAction } = await import('@/actions/admin')
    const resOrgs = await getAllOrgsAction()
    if (resOrgs.success) setOrgs(resOrgs.data)

    const resPlans = await getAllPlansAction()
    if (resPlans.success) setPlans(resPlans.data)
  }

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'orgs', label: `Organizaciones (${orgs.length})`, icon: Building2 },
    { id: 'plans', label: 'Planes', icon: LayoutGrid },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ] as const

  async function handleSaveSettings() {
    setSavingSettings(true)
    await updatePlatformSettingsAction('support_contact', {
      whatsapp_number: waNumber,
      message_template: waMsg,
    })
    setSavingSettings(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="font-semibold">Panel de Administración</h1>
            <p className="text-xs text-muted-foreground">Gestión global de la plataforma WazzAI</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/20">
          Super Admin
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b px-6 shrink-0">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Organizaciones"
                value={initialStats.total_orgs}
                subtitle={`${initialStats.active_orgs} activas`}
                icon={Building2}
                iconColor="text-violet-500"
                iconBg="bg-violet-500/10"
              />
              <StatCard
                title="Usuarios Totales"
                value={initialStats.total_users.toLocaleString()}
                icon={Users}
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
              />
              <StatCard
                title="Mensajes Totales"
                value={initialStats.total_messages.toLocaleString()}
                icon={MessageSquare}
                iconColor="text-green-500"
                iconBg="bg-green-500/10"
              />
              <StatCard
                title="MRR Estimado"
                value={`$${initialStats.revenue_mrr.toLocaleString()}`}
                subtitle="suscripciones activas"
                icon={DollarSign}
                iconColor="text-emerald-500"
                iconBg="bg-emerald-500/10"
              />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('orgs')}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Gestionar Orgs</p>
                      <p className="text-xs text-muted-foreground">{initialStats.suspended_orgs} suspendidas</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  onClick={() => setActiveTab('plans')}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <LayoutGrid className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Ver Planes</p>
                      <p className="text-xs text-muted-foreground">{plans.length} planes configurados</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Revenue</p>
                      <p className="text-xs text-muted-foreground">${initialStats.revenue_mrr}/mes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suspended orgs alert */}
            {initialStats.suspended_orgs > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400 text-sm">
                      {initialStats.suspended_orgs} organización{initialStats.suspended_orgs > 1 ? 'es' : ''} suspendida{initialStats.suspended_orgs > 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => setActiveTab('orgs')}
                      className="text-xs text-amber-700 dark:text-amber-300 underline mt-0.5"
                    >
                      Ver en gestión de organizaciones →
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Orgs ─────────────────────────────────────────────────────────── */}
        {activeTab === 'orgs' && (
          <OrgTable orgs={orgs} plans={plans} onRefresh={handleRefresh} />
        )}

        {/* ── Plans ────────────────────────────────────────────────────────── */}
        {activeTab === 'plans' && (
          <div className="space-y-6 max-w-5xl">
            <PlansManager plans={plans} onRefresh={handleRefresh} />
          </div>
        )}

        {/* ── Settings ─────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Global de la Plataforma</CardTitle>
                <CardDescription>Ajustes generales del sistema WazzAI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp de Soporte / Renovaciones</label>
                  <Input 
                    placeholder="Ej: 573012929983" 
                    value={waNumber} 
                    onChange={e => setWaNumber(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Incluye el código de país sin el signo +, ej. 57 para Colombia o 52 para México.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensaje por Defecto</label>
                  <Input 
                    value={waMsg} 
                    onChange={e => setWaMsg(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Puedes usar la variable literal {'{{org_id}}'} que se reemplazará automáticamente por el ID del tenant.</p>
                </div>
                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Guardar Cambios
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
