'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'
import { startOfDay, endOfDay } from 'date-fns'

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profileData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()
  return (profileData as any)?.org_id ?? null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentReport {
  agent_id: string
  agent_name: string
  total_chats: number
  resolved_chats: number
  avg_resolution_time_min: number
  ai_handled: number
  messages_sent: number
}

export interface DepartmentReport {
  department_id: string
  department_name: string
  total_chats: number
  resolved_chats: number
  avg_resolution_time_min: number
  ai_handled: number
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getAgentReportsAction(
  dateFromStr: string,
  dateToStr: string
): Promise<ActionResult<AgentReport[]>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()
  const dateFrom = startOfDay(new Date(dateFromStr)).toISOString()
  const dateTo = endOfDay(new Date(dateToStr)).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_agent_performance_report', {
    p_org_id: orgId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (error) {
    console.error('getAgentReportsAction:', error)
    return err('Error al obtener el reporte de agentes')
  }

  return ok(
    ((data as any[]) || []).map(row => ({
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      total_chats: Number(row.total_chats),
      resolved_chats: Number(row.resolved_chats),
      avg_resolution_time_min: Number(row.avg_resolution_time_min),
      ai_handled: Number(row.ai_handled),
      messages_sent: Number(row.messages_sent),
    }))
  )
}

export async function getDepartmentReportsAction(
  dateFromStr: string,
  dateToStr: string
): Promise<ActionResult<DepartmentReport[]>> {
  const orgId = await getOrgId()
  if (!orgId) return err('No autorizado')

  const supabase = await createClient()
  const dateFrom = startOfDay(new Date(dateFromStr)).toISOString()
  const dateTo = endOfDay(new Date(dateToStr)).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_department_performance_report', {
    p_org_id: orgId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (error) {
    console.error('getDepartmentReportsAction:', error)
    return err('Error al obtener el reporte de departamentos')
  }

  return ok(
    ((data as any[]) || []).map(row => ({
      department_id: row.department_id,
      department_name: row.department_name,
      total_chats: Number(row.total_chats),
      resolved_chats: Number(row.resolved_chats),
      avg_resolution_time_min: Number(row.avg_resolution_time_min),
      ai_handled: Number(row.ai_handled),
    }))
  )
}
