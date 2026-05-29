import { createAdminClient } from '@/lib/supabase/admin'
import { saveAndSendAIMessage } from '../ai/rag'

export async function processAutomations({
  orgId,
  contactId,
  conversationId,
  phone,
  textContent,
  isFirstMessage
}: {
  orgId: string
  contactId: string
  conversationId: string
  phone: string
  textContent: string
  isFirstMessage: boolean
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
    return await executeFlowStep(activeState, textContent, conversationId, phone, orgId)
  }

  // 2. Not in a flow. Check if we should trigger one.
  const { data: flows } = await (admin as any)
    .from('automation_flows')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)

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
      return await executeFlowStep(newState, textContent, conversationId, phone, orgId)
    }
  }

  return false // No automation handled this message
}

async function executeFlowStep(state: any, incomingText: string, conversationId: string, phone: string, orgId: string): Promise<boolean> {
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
        replyText: currentNode.data.content || '',
      })
    } else if (currentNode.data.actionType === 'handoff') {
      // End flow, turn off AI, mark as pending?
      await (admin as any).from('conversations').update({ is_ai_active: false, status: 'pending' }).eq('id', conversationId)
      await endFlow(state.id)
      return true
    } else if (currentNode.data.actionType === 'condition') {
      // If we just arrived here, wait for input
      if (!state.state_data.waiting_for_condition) {
        await (admin as any).from('flow_states').update({
          current_node_id: currentNodeId,
          state_data: { waiting_for_condition: true, expected: currentNode.data.keyword }
        }).eq('id', state.id)
        return true
      } else {
        // We are resuming
        const expected = state.state_data.expected?.toLowerCase()
        if (expected && incomingText.toLowerCase().includes(expected)) {
          // Condition passed, clear waiting state
          state.state_data.waiting_for_condition = false
        } else {
          // Condition failed, stay here (maybe send a fallback message in the future)
          return true
        }
      }
    }

    // Move to next node
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
