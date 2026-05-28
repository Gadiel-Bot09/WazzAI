'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  MessageSquare,
  Users,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  BarChart3,
  Activity,
} from 'lucide-react'
import type {
  ConversationMetrics,
  DailyMessageSeries,
  LeadsByColumn,
  TopContact,
} from '@/actions/analytics'

interface AnalyticsDashboardProps {
  metrics: ConversationMetrics
  messageSeries: DailyMessageSeries[]
  leadsByColumn: LeadsByColumn[]
  topContacts: TopContact[]
  weeklyTrend: {
    thisWeek: { messages: number; conversations: number }
    lastWeek: { messages: number; conversations: number }
  }
  daysBack: number
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  iconColor?: string
  iconBg?: string
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {trend && trendLabel && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {trendLabel}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AnalyticsDashboard({
  metrics,
  messageSeries,
  leadsByColumn,
  topContacts,
  weeklyTrend,
  daysBack,
}: AnalyticsDashboardProps) {
  // Calculate trends
  const msgTrend = weeklyTrend.lastWeek.messages === 0
    ? 'neutral'
    : weeklyTrend.thisWeek.messages > weeklyTrend.lastWeek.messages ? 'up' : 'down'

  const msgTrendPct = weeklyTrend.lastWeek.messages === 0
    ? null
    : Math.round(
        ((weeklyTrend.thisWeek.messages - weeklyTrend.lastWeek.messages) /
          Math.max(weeklyTrend.lastWeek.messages, 1)) *
          100
      )

  const convTrend = weeklyTrend.lastWeek.conversations === 0
    ? 'neutral'
    : weeklyTrend.thisWeek.conversations > weeklyTrend.lastWeek.conversations ? 'up' : 'down'

  const convTrendPct = weeklyTrend.lastWeek.conversations === 0
    ? null
    : Math.round(
        ((weeklyTrend.thisWeek.conversations - weeklyTrend.lastWeek.conversations) /
          Math.max(weeklyTrend.lastWeek.conversations, 1)) *
          100
      )

  const aiRate = metrics.total_messages === 0
    ? 0
    : Math.round((metrics.ai_messages / metrics.total_messages) * 100)

  // Prepare series data (fill gaps with 0)
  const chartData = messageSeries.map(row => ({
    date: format(parseISO(row.message_date), 'd MMM', { locale: es }),
    Entrantes: row.inbound,
    Salientes: row.outbound,
    IA: row.ai,
  }))

  // Pie data for leads
  const pieData = leadsByColumn.filter(c => c.count > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="font-semibold">Analíticas</h1>
            <p className="text-xs text-muted-foreground">Últimos {daysBack} días · datos en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">
          <Activity className="w-3 h-3 animate-pulse" />
          Live
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Mensajes"
            value={metrics.total_messages.toLocaleString()}
            icon={MessageSquare}
            trend={msgTrend as any}
            trendLabel={msgTrendPct !== null ? `${msgTrendPct > 0 ? '+' : ''}${msgTrendPct}% esta semana` : undefined}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
          />
          <KPICard
            title="Conversaciones"
            value={metrics.total_conversations.toLocaleString()}
            icon={Users}
            trend={convTrend as any}
            trendLabel={convTrendPct !== null ? `${convTrendPct > 0 ? '+' : ''}${convTrendPct}% esta semana` : undefined}
            iconColor="text-violet-500"
            iconBg="bg-violet-500/10"
          />
          <KPICard
            title="Resueltas por IA"
            value={`${aiRate}%`}
            subtitle={`${metrics.ai_messages} mensajes de IA`}
            icon={Bot}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
          />
          <KPICard
            title="Tiempo Promedio"
            value={metrics.avg_resolution_time_min
              ? `${Math.round(metrics.avg_resolution_time_min)} min`
              : '—'}
            subtitle="de resolución"
            icon={Clock}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
          />
        </div>

        {/* ── Secondary KPIs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Abiertas"
            value={metrics.open_conversations}
            icon={CheckCircle2}
            iconColor="text-sky-500"
            iconBg="bg-sky-500/10"
          />
          <KPICard
            title="Cerradas"
            value={metrics.closed_conversations}
            icon={CheckCircle2}
            iconColor="text-slate-500"
            iconBg="bg-slate-500/10"
          />
          <KPICard
            title="Mensajes Entrantes"
            value={metrics.inbound_messages}
            icon={MessageSquare}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
          />
          <KPICard
            title="Mensajes Salientes"
            value={metrics.outbound_messages + metrics.ai_messages}
            icon={MessageSquare}
            iconColor="text-orange-500"
            iconBg="bg-orange-500/10"
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Volumen de Mensajes</CardTitle>
              <CardDescription>Mensajes por día (últimos {daysBack} días)</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-muted-foreground text-sm">
                  Sin datos en este período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEntrantes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="Entrantes"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorEntrantes)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Salientes"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="4 2"
                    />
                    <Area
                      type="monotone"
                      dataKey="IA"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorIA)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart - Leads por columna */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads por Etapa</CardTitle>
              <CardDescription>Distribución en el Kanban</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-muted-foreground text-sm">
                  Sin leads aún
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="column_name"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, name: any) => [value, name]}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ fontSize: '11px' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Top Contacts ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contactos más Activos</CardTitle>
            <CardDescription>Por volumen de mensajes entrantes</CardDescription>
          </CardHeader>
          <CardContent>
            {topContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin contactos aún</p>
            ) : (
              <div className="space-y-3">
                {topContacts.map((contact, idx) => {
                  const maxCount = topContacts[0]?.message_count || 1
                  const pct = Math.round((contact.message_count / maxCount) * 100)
                  return (
                    <div key={contact.phone_number} className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{contact.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                            {contact.message_count} msgs
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
