'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils/server'
import type { ActionResult } from '@/lib/utils/server'

export interface BillingInfo {
  status: string
  planName: string
  trialEnd: string | null
  priceMonthly: number
  priceYearly: number
  limits: Record<string, number>
  supportContact: {
    whatsapp_number: string
    message_template: string
  }
}

export async function getBillingInfoAction(): Promise<ActionResult<BillingInfo>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('No autenticado')

  // Get user org
  const { data } = await supabase
    .from('users')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()
    
  const profile = data as any

  if (!profile?.active_organization_id) return err('No se encontró la organización')

  // Get subscription & plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subData } = await (supabase as any)
    .from('subscriptions')
    .select('status, trial_end, plans(name, price_monthly, price_yearly, limits)')
    .eq('org_id', profile.active_organization_id)
    .single()

  // Get support contact settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settingsData } = await (supabase as any)
    .from('platform_settings')
    .select('value')
    .eq('key', 'support_contact')
    .single()

  const defaultSupport = {
    whatsapp_number: '573012929983',
    message_template: 'Hola, me gustaría solicitar la clave de licencia para mi cuenta WazzAI. Mi ID de Organización es: {{org_id}}'
  }

  const supportContact = settingsData?.value || defaultSupport

  return ok({
    status: subData?.status || 'unpaid',
    planName: subData?.plans?.name || 'Unknown',
    trialEnd: subData?.trial_end || null,
    priceMonthly: subData?.plans?.price_monthly || 0,
    priceYearly: subData?.plans?.price_yearly || 0,
    limits: subData?.plans?.limits || {},
    supportContact: {
      ...supportContact,
      message_template: supportContact.message_template.replace('{{org_id}}', profile.org_id)
    }
  })
}
