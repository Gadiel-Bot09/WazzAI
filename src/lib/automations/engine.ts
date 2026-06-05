import { createAdminClient } from '@/lib/supabase/admin'
import { saveAndSendAIMessage, saveAndSendMediaMessage } from '../ai/rag'

export async function processAutomations({
  orgId,
  contactId,
  conversationId,
  phone,
  textContent,
  isFirstMessage,
  instanceId
}: {
  orgId: string
  contactId: string
  conversationId: string
  phone: string
  textContent: string
  isFirstMessage: boolean
  instanceId: string
}): Promise<boolean> {
  const admin = createAdminClient()

  console.log(`[Automations] Processing: orgId=${orgId}, contactId=${contactId}, instanceId=${instanceId}, isFirst=${isFirstMessage}, text="${textContent}"`)

  // 1. Check if contact is already in an active flow
  const { data: activeState, error: activeStateError } = await (admin as any)
    .from('flow_states')
    .select('*, flow:automation_flows(*)')
    .eq('org_id', orgId)
    .eq('contact_id', contactId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeStateError) {
    console.error('[Automations] Error checking active flow state:', activeStateError)
  }

  if (activeState && activeState.flow) {
    console.log(`[Automations] Resuming active flow: ${activeState.flow.name}`)
    return await executeFlowStep(activeState, textContent, conversationId, phone, orgId, instanceId)
  }

  // 2. Not in a flow. Try to trigger one.
  // Fetch all active flows for this org
  const { data: flows, error: flowsError } = await (admin as any)
    .from('automation_flows')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (flowsError) {
    console.error('[Automations] Error fetching flows:', flowsError)
    return false
  }

  // Filter: global flows (null instance_id) OR flows matching this specific instance
  const eligibleFlows = (flows || []).filter((f: any) =>
    !f.instance_id || f.instance_id === instanceId
  )

  console.log(`[Automations] Found ${eligibleFlows.length} eligible flows (${flows?.length || 0} total for org), isFirstMessage=${isFirstMessage}, text="${textContent}"`)

  if (!eligibleFlows.length) return false

  let matchedFlow: any = null

  for (const flow of eligibleFlows) {
    const triggerType = flow.trigger_type
    console.log(`[Automations] Checking flow "${flow.name}" trigger="${triggerType}" instance_id=${flow.instance_id}`)

    let matched = false

    // Welcome/first message trigger — fires when conversation is new
    if ((triggerType === 'welcome' || triggerType === 'both') && isFirstMessage) {
      console.log(`[Automations] Matched flow "${flow.name}" via WELCOME trigger`)
      matched = true
    }

    // Keyword trigger — fires regardless of isFirstMessage
    if (!matched && (triggerType === 'keyword' || triggerType === 'both')) {
      const keywords = (flow.trigger_keywords || [])
        .map((k: string) => k.toLowerCase().trim())
        .filter(Boolean)
      const textLower = textContent.toLowerCase().trim()
      const keywordMatch = keywords.length === 0 ? false : keywords.some((k: string) => textLower.includes(k))
      console.log(`[Automations] Keywords [${keywords.join(', ')}] vs "${textLower}" → ${keywordMatch}`)
      if (keywordMatch) {
        console.log(`[Automations] Matched flow "${flow.name}" via KEYWORD trigger`)
        matched = true
      }
    }

    if (matched) {
      matchedFlow = flow
      break
    }
  }

  if (!matchedFlow) {
    console.log('[Automations] No matching flow found')
    return false
  }

  // Start the matched flow
  const nodes = matchedFlow.nodes || []
  const edges = matchedFlow.edges || []

  // Find the trigger node
  const triggerNode = nodes.find((n: any) =>
    n.id.startsWith('trigger') || n.data?.actionType === 'trigger'
  )

  // Skip the trigger node — find the first real action node via edge
  let startNode: any = null
  if (triggerNode) {
    const firstEdge = edges.find((e: any) => e.source === triggerNode.id)
    if (firstEdge) {
      startNode = nodes.find((n: any) => n.id === firstEdge.target)
    }
  }
  // Fallback to trigger node if no edge found, or first node
  if (!startNode) startNode = triggerNode || nodes[0]

  if (!startNode) {
    console.error(`[Automations] Flow "${matchedFlow.name}" has no nodes`)
    return false
  }

  console.log(`[Automations] Starting flow "${matchedFlow.name}" at node "${startNode.id}" (${startNode.data?.actionType})`)

  // Create flow state — first remove old completed/failed states to avoid UNIQUE constraint issues
  // (This handles cases where the DB migration 007 wasn't applied)
  const { error: deleteError } = await (admin as any)
    .from('flow_states')
    .delete()
    .eq('contact_id', contactId)
    .eq('org_id', orgId)
    .in('status', ['completed', 'failed', 'error'])

  if (deleteError) {
    console.warn('[Automations] Could not clean up old flow states (non-fatal):', deleteError.message)
  }

  // Also mark any stale 'active' states as failed (edge case: orphaned active state)
  await (admin as any)
    .from('flow_states')
    .update({ status: 'failed' })
    .eq('contact_id', contactId)
    .eq('org_id', orgId)
    .eq('status', 'active')

  // Insert new state
  const { data: newState, error: stateError } = await (admin as any)
    .from('flow_states')
    .insert({
      org_id: orgId,
      contact_id: contactId,
      flow_id: matchedFlow.id,
      current_node_id: startNode.id,
      status: 'active',
      state_data: {}
    })
    .select('*, flow:automation_flows(*)')
    .single()

  if (stateError || !newState) {
    console.error('[Automations] Failed to create flow state:', JSON.stringify(stateError))
    return false
  }

  return await executeFlowStep(newState, textContent, conversationId, phone, orgId, instanceId)
}

async function executeFlowStep(
  state: any,
  incomingText: string,
  conversationId: string,
  phone: string,
  orgId: string,
  instanceId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const flow = state.flow
  const nodes = flow.nodes || []
  const edges = flow.edges || []

  let currentNodeId = state.current_node_id
  let maxSteps = 10 // Prevent infinite loops

  while (maxSteps > 0) {
    maxSteps--
    const currentNode = nodes.find((n: any) => n.id === currentNodeId)
    if (!currentNode) {
      console.log(`[Automations] Node "${currentNodeId}" not found, ending flow`)
      await endFlow(state.id)
      return true
    }

    const actionType = currentNode.data?.actionType
    console.log(`[Automations] Executing node "${currentNodeId}" type="${actionType}"`)

    if (actionType === 'trigger') {
      // Skip trigger node, move to next
      console.log('[Automations] Skipping trigger node...')

    } else if (actionType === 'message') {
      await saveAndSendAIMessage({
        conversationId,
        orgId,
        contactPhone: phone,
        replyText: currentNode.data.content as string,
        instanceId,
      })

    } else if (actionType === 'image') {
      if (currentNode.data.url) {
        await saveAndSendMediaMessage({
          conversationId,
          orgId,
          contactPhone: phone,
          mediaUrl: currentNode.data.url as string,
          caption: currentNode.data.content as string | undefined,
          mediaType: 'image',
          instanceId,
        })
      }

    } else if (actionType === 'delay') {
      // Cap delay to avoid blocking too long in webhook context
      const seconds = Math.min(Number(currentNode.data.seconds) || 5, 30)
      console.log(`[Automations] Delay ${seconds}s`)
      await new Promise(resolve => setTimeout(resolve, seconds * 1000))

    } else if (actionType === 'handoff') {
      const handoffMsg = currentNode.data.content || 'Serás transferido a un asesor en breve...'
      await saveAndSendAIMessage({
        conversationId,
        orgId,
        contactPhone: phone,
        replyText: handoffMsg as string,
        instanceId,
      })
      const updatePayload: any = { is_ai_active: false, status: 'pending' }
      if (currentNode.data.department_id) {
        updatePayload.department_id = currentNode.data.department_id
      }
      await (admin as any).from('conversations').update(updatePayload).eq('id', conversationId)
      await endFlow(state.id)
      return true

    } else if (actionType === 'menu') {
      if (!state.state_data?.waiting_for_input) {
        // First time hitting this node — send the menu options
        let menuText = currentNode.data.content || 'Selecciona una opción'
        if (currentNode.data.options?.length > 0) {
          menuText += '\n\n' + currentNode.data.options.join('\n')
        }
        await saveAndSendAIMessage({
          conversationId,
          orgId,
          contactPhone: phone,
          replyText: menuText,
          instanceId,
        })
        await (admin as any).from('flow_states').update({
          current_node_id: currentNodeId,
          state_data: { waiting_for_input: true, options: currentNode.data.options },
        }).eq('id', state.id)
        return true // Wait for user input

      } else {
        // Resuming — match user input to menu option
        const options: string[] = state.state_data.options || []
        const inputStr = incomingText.trim().toLowerCase()

        const matchedIndex = options.findIndex((opt: string) => {
          const optLower = opt.trim().toLowerCase()
          if (optLower === inputStr) return true
          const firstPart = optLower.split(/[\s-.)]+/)[0]
          return firstPart && firstPart === inputStr
        })

        if (matchedIndex !== -1) {
          state.state_data.waiting_for_input = false
          const nextEdge = edges.find((e: any) => e.source === currentNodeId && e.sourceHandle === `opt-${matchedIndex}`)
          if (nextEdge) {
            currentNodeId = nextEdge.target
            await (admin as any).from('flow_states').update({
              current_node_id: currentNodeId,
              state_data: state.state_data,
            }).eq('id', state.id)
            continue
          }
          await endFlow(state.id)
          return true
        } else {
          await saveAndSendAIMessage({
            conversationId,
            orgId,
            contactPhone: phone,
            replyText: 'Opción no válida. Por favor selecciona una de las opciones del menú.',
            instanceId,
          })
          return true
        }
      }

    } else if (actionType === 'condition') {
      if (!state.state_data?.waiting_for_condition) {
        await (admin as any).from('flow_states').update({
          current_node_id: currentNodeId,
          state_data: {
            waiting_for_condition: true,
            expected: currentNode.data.keyword,
            operator: currentNode.data.operator,
          },
        }).eq('id', state.id)
        return true

      } else {
        const expected = (state.state_data.expected || '').toLowerCase()
        const operator = state.state_data.operator || 'contains'
        const inputStr = incomingText.toLowerCase()

        let conditionPassed = false
        if (operator === 'contains') conditionPassed = inputStr.includes(expected)
        else if (operator === 'equals') conditionPassed = inputStr === expected
        else if (operator === 'startsWith') conditionPassed = inputStr.startsWith(expected)

        state.state_data.waiting_for_condition = false
        const handleId = conditionPassed ? 'true' : 'false'
        const nextEdge = edges.find((e: any) => e.source === currentNodeId && e.sourceHandle === handleId)
          || edges.find((e: any) => e.source === currentNodeId && !e.sourceHandle)

        if (nextEdge) {
          currentNodeId = nextEdge.target
          await (admin as any).from('flow_states').update({
            current_node_id: currentNodeId,
            state_data: state.state_data,
          }).eq('id', state.id)
          continue
        }
        await endFlow(state.id)
        return true
      }
    }

    // Linear progression: move to the next connected node
    const nextEdge = edges.find((e: any) => e.source === currentNodeId)
    if (nextEdge) {
      currentNodeId = nextEdge.target
      await (admin as any).from('flow_states').update({
        current_node_id: currentNodeId,
        state_data: state.state_data || {},
      }).eq('id', state.id)
    } else {
      console.log(`[Automations] No more edges from "${currentNodeId}", flow complete`)
      await endFlow(state.id)
      return true
    }
  }

  return true
}

async function endFlow(stateId: string) {
  const admin = createAdminClient()
  await (admin as any).from('flow_states').update({ status: 'completed' }).eq('id', stateId)
  console.log(`[Automations] Flow state ${stateId} marked as completed`)
}
