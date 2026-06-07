'use client'

import { useState, useEffect, useCallback } from 'react'
import { subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Loader2, Users, Building, Bot, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getAgentReportsAction, getDepartmentReportsAction } from '@/actions/reports'
import type { AgentReport, DepartmentReport } from '@/actions/reports'

export function ReportsDashboard() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [activeTab, setActiveTab] = useState<'agents' | 'departments'>('agents')
  
  const [loading, setLoading] = useState(false)
  const [agentData, setAgentData] = useState<AgentReport[]>([])
  const [deptData, setDeptData] = useState<DepartmentReport[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [agentRes, deptRes] = await Promise.all([
      getAgentReportsAction(dateFrom, dateTo),
      getDepartmentReportsAction(dateFrom, dateTo)
    ])

    if (agentRes.success) setAgentData(agentRes.data)
    else toast.error('Error cargando reporte de agentes')

    if (deptRes.success) setDeptData(deptRes.data)
    else toast.error('Error cargando reporte de departamentos')

    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const exportToCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      let fileName = ''

      if (activeTab === 'agents') {
        fileName = `reporte_agentes_${dateFrom}_al_${dateTo}.csv`
        csvContent += 'Agente,Chats Totales,Chats Resueltos,Atendidos por IA,Mensajes Enviados,SLA Promedio (min)\n'
        agentData.forEach(row => {
          csvContent += `"${row.agent_name}",${row.total_chats},${row.resolved_chats},${row.ai_handled},${row.messages_sent},${row.avg_resolution_time_min.toFixed(2)}\n`
        })
      } else {
        fileName = `reporte_departamentos_${dateFrom}_al_${dateTo}.csv`
        csvContent += 'Departamento,Chats Totales,Chats Resueltos,Atendidos por IA,SLA Promedio (min)\n'
        deptData.forEach(row => {
          csvContent += `"${row.department_name}",${row.total_chats},${row.resolved_chats},${row.ai_handled},${row.avg_resolution_time_min.toFixed(2)}\n`
        })
      }

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Reporte descargado correctamente')
    } catch (e) {
      toast.error('Error al exportar el CSV')
    }
  }

  const formatMin = (min: number) => {
    if (min < 60) return `${Math.round(min)} min`
    const h = Math.floor(min / 60)
    const m = Math.round(min % 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto p-4 md:p-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Rendimiento</h1>
          <p className="text-muted-foreground">Analiza el desempeño de agentes, departamentos y tiempos de resolución SLA.</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-muted/30 p-1.5 rounded-lg border shadow-sm">
          <Input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-auto h-9 border-0 bg-transparent shadow-none"
          />
          <span className="text-muted-foreground text-sm">hasta</span>
          <Input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)}
            className="w-auto h-9 border-0 bg-transparent shadow-none"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-muted/30 p-2 rounded-xl border">
        <div className="flex gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'agents' 
                ? 'bg-primary text-primary-foreground shadow' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Users className="w-4 h-4" />
            Por Agente
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'departments' 
                ? 'bg-primary text-primary-foreground shadow' 
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Building className="w-4 h-4" />
            Por Departamento
          </button>
        </div>

        <Button onClick={exportToCSV} variant="outline" className="w-full md:w-auto gap-2">
          <Download className="w-4 h-4" />
          Exportar a CSV
        </Button>
      </div>

      <div className="bg-white dark:bg-[#1a202c] border rounded-xl overflow-hidden shadow-sm relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {activeTab === 'agents' ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Agente</th>
                  <th className="px-6 py-4 text-center">Chats Totales</th>
                  <th className="px-6 py-4 text-center">Resueltos</th>
                  <th className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1"><Bot className="w-3.5 h-3.5"/> Atendidos IA</div>
                  </th>
                  <th className="px-6 py-4 text-center">Mensajes Enviados</th>
                  <th className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5"/> SLA Promedio</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agentData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No hay datos en este rango de fechas.</td>
                  </tr>
                )}
                {agentData.map(agent => (
                  <tr key={agent.agent_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{agent.agent_name}</td>
                    <td className="px-6 py-4 text-center">{agent.total_chats}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-medium">{agent.resolved_chats}</td>
                    <td className="px-6 py-4 text-center">{agent.ai_handled}</td>
                    <td className="px-6 py-4 text-center text-blue-600 dark:text-blue-400">{agent.messages_sent}</td>
                    <td className="px-6 py-4 text-center font-medium">{formatMin(agent.avg_resolution_time_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4 text-center">Chats Totales</th>
                  <th className="px-6 py-4 text-center">Resueltos</th>
                  <th className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1"><Bot className="w-3.5 h-3.5"/> Atendidos IA</div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5"/> SLA Promedio</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deptData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No hay datos en este rango de fechas.</td>
                  </tr>
                )}
                {deptData.map(dept => (
                  <tr key={dept.department_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{dept.department_name}</td>
                    <td className="px-6 py-4 text-center">{dept.total_chats}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-medium">{dept.resolved_chats}</td>
                    <td className="px-6 py-4 text-center">{dept.ai_handled}</td>
                    <td className="px-6 py-4 text-center font-medium">{formatMin(dept.avg_resolution_time_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
