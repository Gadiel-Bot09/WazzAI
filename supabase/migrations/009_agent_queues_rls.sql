-- Migration 009: Agent Queues and RLS Modifications

-- 1. Add status and max_active_chats to team_members
ALTER TABLE public.team_members
ADD COLUMN status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'busy')),
ADD COLUMN max_active_chats INTEGER NOT NULL DEFAULT 3;

-- 2. Modify RLS for conversations
-- Drop existing policies
DROP POLICY IF EXISTS "conversations_select_own_org" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own_org" ON public.conversations;
-- Keep insert as is, or restrict to service role (messages and conversations usually inserted by webhooks)
-- Wait, the initial schema had select, insert, update. Let's redefine SELECT and UPDATE.

-- New SELECT policy for conversations
CREATE POLICY "conversations_select_own_org" ON public.conversations
  FOR SELECT USING (
    org_id = get_current_user_org_id() 
    AND (
      -- Admins see all
      (SELECT role FROM public.team_members WHERE user_id = auth.uid() AND org_id = conversations.org_id LIMIT 1) = 'admin'
      OR auth.role() = 'service_role'
      -- Assigned agents see their own
      OR assigned_to = auth.uid()
      -- Agents see unassigned chats for their department
      OR (
        assigned_to IS NULL 
        AND (
          department_id = (SELECT department_id FROM public.team_members WHERE user_id = auth.uid() AND org_id = conversations.org_id LIMIT 1)
          OR department_id IS NULL -- If chat has no department, maybe let all agents in org see it to claim it? Or maybe just agents without department. Let's allow agents with matching department, or if chat has no department, any agent can see it to claim.
        )
      )
    )
  );

-- New UPDATE policy for conversations
CREATE POLICY "conversations_update_own_org" ON public.conversations
  FOR UPDATE USING (
    org_id = get_current_user_org_id() 
    AND (
      (SELECT role FROM public.team_members WHERE user_id = auth.uid() AND org_id = conversations.org_id LIMIT 1) = 'admin'
      OR auth.role() = 'service_role'
      OR assigned_to = auth.uid()
      -- Allow an agent to claim an unassigned chat
      OR assigned_to IS NULL
    )
  );

-- 3. Modify RLS for messages
-- Messages should follow conversation visibility. But for performance, often simpler is better.
-- The existing policy just checks org_id. If we want strict privacy, we can check conversation assigned_to.
DROP POLICY IF EXISTS "messages_select_own_org" ON public.messages;

CREATE POLICY "messages_select_own_org" ON public.messages
  FOR SELECT USING (
    org_id = get_current_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = messages.conversation_id 
      AND (
        (SELECT role FROM public.team_members WHERE user_id = auth.uid() AND org_id = c.org_id LIMIT 1) = 'admin'
        OR auth.role() = 'service_role'
        OR c.assigned_to = auth.uid()
        OR c.assigned_to IS NULL
      )
    )
  );
