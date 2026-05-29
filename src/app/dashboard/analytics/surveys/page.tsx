'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSurveyReportAction } from '@/actions/conversation-actions'
import { Loader2, Star, TrendingUp, MessageSquare, CheckCircle2, BarChart3 } from 'lucide-react'

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= score ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border bg-background p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function SurveysPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getSurveyReportAction({ from: from || undefined, to: to || undefined, page, pageSize: 20 })
    setLoading(false)
    if (res.success) setData(res.data)
  }, [page, from, to])

  useEffect(() => { load() }, [load])

  const maxDist = data ? Math.max(...Object.values(data.distribution as Record<number, number>), 1) : 1

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Star className="w-4 h-4 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Reporte de Encuestas</h1>
      </div>
      <p className="text-muted-foreground text-sm -mt-4">
        Auditoría de satisfacción del cliente enviadas al cerrar conversaciones.
      </p>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Desde</label>
          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="h-9 px-3 rounded-md border text-sm bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1) }}
            className="h-9 px-3 rounded-md border text-sm bg-background"
          />
        </div>
        {(from || to) && (
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => { setFrom(''); setTo(''); setPage(1) }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Promedio de satisfacción"
              value={data.avgScore !== null ? `${data.avgScore.toFixed(1)} / 5` : '—'}
              sub="Sobre respuestas recibidas"
              icon={Star}
              color="bg-amber-500"
            />
            <KPICard
              label="Encuestas enviadas"
              value={data.total}
              sub="En el período seleccionado"
              icon={MessageSquare}
              color="bg-blue-500"
            />
            <KPICard
              label="Tasa de respuesta"
              value={`${data.responseRate}%`}
              sub="Contactos que respondieron"
              icon={CheckCircle2}
              color="bg-emerald-500"
            />
            <KPICard
              label="Respondidas"
              value={data.surveys.filter((s: any) => s.score !== null).length}
              sub="Con calificación registrada"
              icon={TrendingUp}
              color="bg-violet-500"
            />
          </div>

          {/* Score Distribution */}
          {data.avgScore !== null && (
            <div className="rounded-xl border bg-background p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Distribución de calificaciones</h2>
              </div>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(score => {
                  const count = (data.distribution as Record<number, number>)[score] ?? 0
                  const pct = Math.round((count / maxDist) * 100)
                  const labels: Record<number, string> = {
                    5: 'Excelente', 4: 'Bueno', 3: 'Regular', 2: 'Malo', 1: 'Muy malo'
                  }
                  const colors: Record<number, string> = {
                    5: 'bg-emerald-500', 4: 'bg-green-400', 3: 'bg-amber-400', 2: 'bg-orange-400', 1: 'bg-red-500'
                  }
                  return (
                    <div key={score} className="flex items-center gap-3">
                      <StarRating score={score} />
                      <span className="text-xs text-muted-foreground w-16">{labels[score]}</span>
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[score]} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Survey Table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
              <h2 className="font-semibold text-sm">Detalle de encuestas</h2>
              <span className="text-xs text-muted-foreground">({data.total} total)</span>
            </div>
            {data.surveys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Star className="w-8 h-8 opacity-30" />
                <p className="text-sm">No hay encuestas para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 text-muted-foreground text-xs uppercase tracking-wide border-b">
                      <th className="text-left px-4 py-3 font-medium">Contacto</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Teléfono</th>
                      <th className="text-left px-4 py-3 font-medium">Calificación</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Estado</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Enviada</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Respondida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.surveys.map((s: any) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {s.contact?.name || s.contact?.phone_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                          {s.contact?.phone_number ? `+${s.contact.phone_number}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {s.score !== null
                            ? <StarRating score={s.score} />
                            : <span className="text-xs text-muted-foreground">Sin respuesta</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            s.status === 'responded'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                              : s.status === 'expired'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          }`}>
                            {s.status === 'responded' ? 'Respondida' : s.status === 'expired' ? 'Expirada' : 'Enviada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {new Date(s.sent_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {s.responded_at
                            ? new Date(s.responded_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data.total > 20 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} de {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded border text-xs hover:bg-muted disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Anterior
                </button>
                <button
                  className="px-3 py-1 rounded border text-xs hover:bg-muted disabled:opacity-40"
                  disabled={page * 20 >= data.total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">Error al cargar el reporte</div>
      )}
    </div>
  )
}
