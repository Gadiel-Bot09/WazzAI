-- ============================================================
-- Migration 008: Idempotency and flow stability
-- ============================================================

-- 1. Add UNIQUE constraint on evolution_msg_id to prevent duplicate messages
--    even under race conditions (Evolution API sends webhooks twice)
ALTER TABLE messages 
  ADD CONSTRAINT messages_evolution_msg_id_unique 
  UNIQUE (evolution_msg_id);

-- 2. Ensure the UNIQUE(contact_id) constraint is fully removed from flow_states
--    (007 may not have run, or the constraint name may differ)
ALTER TABLE flow_states DROP CONSTRAINT IF EXISTS flow_states_contact_id_key;
ALTER TABLE flow_states DROP CONSTRAINT IF EXISTS flow_states_contact_id_unique;

-- Remove any other unique indexes on contact_id that aren't partial
DROP INDEX IF EXISTS flow_states_contact_id_key;

-- 3. Create correct partial unique: only one ACTIVE state per contact at a time
CREATE UNIQUE INDEX IF NOT EXISTS flow_states_contact_active_unique
  ON flow_states (contact_id) WHERE status = 'active';

-- 4. Make sure automation_flows has instance_id column
ALTER TABLE automation_flows 
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- 5. Useful indexes
CREATE INDEX IF NOT EXISTS idx_automation_flows_instance ON automation_flows(instance_id);
CREATE INDEX IF NOT EXISTS idx_flow_states_contact_status ON flow_states(contact_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_evolution_msg_id ON messages(evolution_msg_id);
