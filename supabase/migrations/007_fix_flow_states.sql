-- ============================================================
-- Migration 007: Fix flow_states UNIQUE constraint
-- The original UNIQUE(contact_id) prevents a contact from
-- ever restarting a flow after completing one.
-- We change it to only be unique per ACTIVE flow state.
-- ============================================================

-- Drop the old unique constraint
ALTER TABLE flow_states DROP CONSTRAINT IF EXISTS flow_states_contact_id_key;

-- Add a partial unique index instead: a contact can only be in ONE active flow at a time,
-- but can have multiple completed ones
CREATE UNIQUE INDEX IF NOT EXISTS flow_states_contact_active_unique
  ON flow_states (contact_id)
  WHERE status = 'active';

-- Add instance_id to automation_flows if not present (for per-instance flows)
ALTER TABLE automation_flows ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_automation_flows_instance ON automation_flows(instance_id);
CREATE INDEX IF NOT EXISTS idx_flow_states_contact_status ON flow_states(contact_id, status);
