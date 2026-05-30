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

  // 1. Check if user is in an active flow
  const { data: activeState } = await (admin as any)
    .from('flow_states')
    .select('*, flow:automation_flows(*)')
    .eq('org_id', orgId)
    .eq('contact_id', contactId)
    .eq('status', 'active')
    .single()

  if (activeState && activeState.flow) {
    // Resume flow
    return await executeFlowStep(activeState, textContent, conversationId, phone, orgId, instanceId)
  }

  // 2. Not in a flow. Check if we should trigger one.
  const { data: flows } = await (admin as any)
    .from('automation_flows')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .or(`instance_id.is.null,instance_id.eq.${instanceId}`)

  if (!flows || flows.length === 0) return false

  let matchedFlow = null

  for (const flow of flows) {
    if (flow.trigger_type === 'welcome' || flow.trigger_type === 'both') {
      if (isFirstMessage) {
        matchedFlow = flow
        break
      }
    }
    
    if (flow.trigger_type === 'keyword' || flow.trigger_type === 'both') {
      const keywords = (flow.trigger_keywords || []).map((k: string) => k.toLowerCase().trim())
      const textLower = textContent.toLowerCase()
      if (keywords.some((k: string) => textLower.includes(k))) {
        matchedFlow = flow
        break
      }
    }
  }

  if (matchedFlow) {
    // Start flow
    const firstNode = matchedFlow.nodes.find((n: any) => n.id.startsWith('trigger')) || matchedFlow.nodes[0]
    if (!firstNode) return false

    // Create state
    const { data: newState } = await (admin as any)
      .from('flow_states')
      .insert({
        org_id: orgId,
        contact_id: contactId,
        flow_id: matchedFlow.id,
        current_node_id: firstNode.id,
        status: 'active'
      })
      .select('*, flow:automation_flows(*)')
      .single()

    if (newState) {
      // Execute from first node
      return await executeFlowStep(newState, textContent, conversationId, phone, orgId, instanceId)
    }
  }

  return false // No automation handled this message
}

async function executeFlowStep(state: any, incomingText: string, conversationId: string, phone: string, orgId: string, instanceId: string): Promise<boolean> {
  const admin = createAdminClient()
  const flow = state.flow
  const nodes = flow.nodes || []
  const edges = flow.edges || []

  let currentNodeId = state.current_node_id
  let maxSteps = 5 // Prevent infinite loops
  let waitingForInput = false

  while (maxSteps > 0 && !waitingForInput) {
    const currentNode = nodes.find((n: any) => n.id === currentNodeId)
    if (!currentNode) {
      // Flow ended or broken
      await endFlow(state.id)
      return true // Handled
    }

    // Process node action
    if (currentNode.data.actionType === 'message') {
      // Send message
      await saveAndSendAIMessage({
        conversationId,
        orgId,
        contactPhone: phone,
        replyText: currentNode.data.content as string,
        instanceId
      })
    } else if (currentNode.data.actionType === 'image') {
      // Send image
      if (currentNode.data.url) {
        await saveAndSendMediaMessage({
          conversationId,
          orgId,
          contactPhone: phone,
          mediaUrl: currentNode.data.url as string,
          caption: currentNode.data.content as string | undefined,
          mediaType: 'image',
          instanceId
        })
      }
    } else if (currentNode.data.actionType === 'delay') {
      // Pause execution
      const seconds = currentNode.data.seconds || 5
      await new Promise(resolve => setTimeout(resolve, seconds * 1000))
    } else if (currentNode.data.actionType === 'handoff') {
      const handoffMsg = currentNode.data.content || 'Serás transferido a un asesor en breve...'
      await saveAndSendAIMessage({
        conversationId,
        orgId,
        contactPhone: phone,
        replyText: handoffMsg as string,
        instanceId
      })
      // End flow, turn off AI, mark as pending?
      await (admin as any).from('conversations').update({ is_ai_active: false, status: 'pending' }).eq('id', conversationId)
      await endFlow(state.id)
      return true
    } else if (currentNode.data.actionType === 'menu') {
      if (!state.state_data.waiting_for_input) {
        // Format menu text to include options
        let menuText = currentNode.data.content || 'Selecciona una opción'
        if (currentNode.data.options && Array.isArray(currentNode.data.options) && currentNode.data.options.length > 0) {
          menuText += '\n\n' + currentNode.data.options.join('\n')
        }

        // Send menu message and wait
        await saveAndSendAIMessage({
          conversationId,
          orgId,
          contactPhone: phone,
          replyText: menuText,
          instanceId
        })
        await (admin as any).from('flow_states').update({
          current_node_id: currentNodeId,
          state_data: { waiting_for_input: true, options: currentNode.data.options }
        }).eq('id', state.id)
        return true
      } else {
        // Resuming from menu
        const options = state.state_data.options || []
        const inputStr = incomingText.trim().toLowerCase()
        
        const matchedIndex = options.findIndex((opt: string) => {
          const optLower = opt.trim().toLowerCase()
          if (optLower === inputStr) return true
          
          // Match first number/word (e.g., "1" matches "1 - Citas")
          const firstPart = optLower.split(/[\s-.)]+/)[0]
          if (firstPart && firstPart === inputStr) return true
          
          return false
        })
        
        if (matchedIndex !== -1) {
          state.state_data.waiting_for_input = false
          // We need to branch using matchedOption index
          const nextEdge = edges.find((e: any) => e.source === currentNodeId && e.sourceHandle === `opt-${matchedIndex}`)
          if (nextEdge) {
            currentNodeId = nextEdge.target
            await (admin as any).from('flow_states').update({
              current_node_id: currentNodeId,
              state_data: state.state_data
            }).eq('id', state.id)
            continue // Skip default next Edge routing
          } else {
            await endFlow(state.id)
            return true
          }
        } else {
          // Invalid option, send error or wait again
          await saveAndSendAIMessage({
            conversationId,
            orgId,
            contactPhone: phone,
            replyText: 'Opción no válida. Por favor, selecciona una de las opciones del menú.',
            instanceId
          })
          return true
        }
      }
    } else if (currentNode.data.actionType === 'condition') {
      // If we just arrived here, wait for input
      if (!state.state_data.waiting_for_condition) {
        await (admin as any).from('flow_states').update({
          current_node_id: currentNodeId,
          state_data: { waiting_for_condition: true, expected: currentNode.data.keyword, operator: currentNode.data.operator }
        }).eq('id', state.id)
        return true
      } else {
        // We are resuming
        const expected = state.state_data.expected?.toLowerCase() || ''
        const operator = state.state_data.operator || 'contains'
        const inputStr = incomingText.toLowerCase()
        
        let conditionPassed = false
        if (operator === 'contains') {
          conditionPassed = inputStr.includes(expected)
        } else if (operator === 'equals') {
          conditionPassed = inputStr === expected
        } else if (operator === 'startsWith') {
          conditionPassed = inputStr.startsWith(expected)
        }

        state.state_data.waiting_for_condition = false
        
        // Branch
        const handleId = conditionPassed ? 'true' : 'false'
        const nextEdge = edges.find((e: any) => e.source === currentNodeId && e.sourceHandle === handleId)
        
        if (nextEdge) {
          currentNodeId = nextEdge.target
          await (admin as any).from('flow_states').update({
            current_node_id: currentNodeId,
            state_data: state.state_data
          }).eq('id', state.id)
          continue
        } else {
          // If there's no edge, try the default one (fallback), or end flow
          const defaultEdge = edges.find((e: any) => e.source === currentNodeId && !e.sourceHandle)
          if (defaultEdge) {
            currentNodeId = defaultEdge.target
            await (admin as any).from('flow_states').update({
              current_node_id: currentNodeId,
              state_data: state.state_data
            }).eq('id', state.id)
            continue
          } else {
            await endFlow(state.id)
            return true
          }
        }
      }
    }

    // Move to next node (default linear progression for non-branching nodes)
    const nextEdge = edges.find((e: any) => e.source === currentNodeId)
    if (nextEdge) {
      currentNodeId = nextEdge.target
      await (admin as any).from('flow_states').update({
        current_node_id: currentNodeId,
        state_data: state.state_data
      }).eq('id', state.id)
    } else {
      // End of flow
      await endFlow(state.id)
      return true
    }

    maxSteps--
  }

  return true
}

async function endFlow(stateId: string) {
  const admin = createAdminClient()
  await (admin as any).from('flow_states').update({ status: 'completed' }).eq('id', stateId)
}
