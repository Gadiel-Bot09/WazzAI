-- Migration 011: Reports Functions
-- Creates RPC functions for detailed SLA and performance reporting

-- 1. Agent Performance Report
CREATE OR REPLACE FUNCTION get_agent_performance_report(
  p_org_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  total_chats BIGINT,
  resolved_chats BIGINT,
  avg_resolution_time_min NUMERIC,
  ai_handled BIGINT,
  messages_sent BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH agent_conversations AS (
    SELECT 
      c.assigned_to,
      COUNT(c.id) as total_chats,
      COUNT(c.id) FILTER (WHERE c.status = 'closed') as resolved_chats,
      COUNT(c.id) FILTER (WHERE c.is_ai_active = true) as ai_handled,
      AVG(EXTRACT(EPOCH FROM (c.closed_at - c.created_at))/60) FILTER (WHERE c.status = 'closed' AND c.closed_at IS NOT NULL) as avg_res_min
    FROM conversations c
    WHERE c.org_id = p_org_id
      AND c.created_at >= p_date_from
      AND c.created_at <= p_date_to
      AND c.assigned_to IS NOT NULL
    GROUP BY c.assigned_to
  ),
  agent_messages AS (
    SELECT 
      m.sender_id,
      COUNT(m.id) as messages_sent
    FROM messages m
    WHERE m.org_id = p_org_id
      AND m.sent_at >= p_date_from
      AND m.sent_at <= p_date_to
      AND m.sender_id IS NOT NULL
      AND m.direction = 'outbound'
      AND m.is_internal_note = false
    GROUP BY m.sender_id
  )
  SELECT 
    u.id as agent_id,
    u.full_name as agent_name,
    COALESCE(ac.total_chats, 0) as total_chats,
    COALESCE(ac.resolved_chats, 0) as resolved_chats,
    COALESCE(ac.avg_res_min, 0)::NUMERIC as avg_resolution_time_min,
    COALESCE(ac.ai_handled, 0) as ai_handled,
    COALESCE(am.messages_sent, 0) as messages_sent
  FROM users u
  JOIN team_members tm ON tm.user_id = u.id AND tm.org_id = p_org_id
  LEFT JOIN agent_conversations ac ON ac.assigned_to = u.id
  LEFT JOIN agent_messages am ON am.sender_id = u.id
  ORDER BY COALESCE(ac.total_chats, 0) DESC;
END;
$$;

-- 2. Department Performance Report
CREATE OR REPLACE FUNCTION get_department_performance_report(
  p_org_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
)
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  total_chats BIGINT,
  resolved_chats BIGINT,
  avg_resolution_time_min NUMERIC,
  ai_handled BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH dept_conversations AS (
    SELECT 
      c.department_id,
      COUNT(c.id) as total_chats,
      COUNT(c.id) FILTER (WHERE c.status = 'closed') as resolved_chats,
      COUNT(c.id) FILTER (WHERE c.is_ai_active = true) as ai_handled,
      AVG(EXTRACT(EPOCH FROM (c.closed_at - c.created_at))/60) FILTER (WHERE c.status = 'closed' AND c.closed_at IS NOT NULL) as avg_res_min
    FROM conversations c
    WHERE c.org_id = p_org_id
      AND c.created_at >= p_date_from
      AND c.created_at <= p_date_to
    GROUP BY c.department_id
  )
  SELECT 
    d.id as department_id,
    COALESCE(d.name, 'Sin Departamento') as department_name,
    COALESCE(dc.total_chats, 0) as total_chats,
    COALESCE(dc.resolved_chats, 0) as resolved_chats,
    COALESCE(dc.avg_res_min, 0)::NUMERIC as avg_resolution_time_min,
    COALESCE(dc.ai_handled, 0) as ai_handled
  FROM dept_conversations dc
  LEFT JOIN departments d ON d.id = dc.department_id
  ORDER BY dc.total_chats DESC;
END;
$$;
