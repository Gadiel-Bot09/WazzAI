-- ============================================================
-- ADD INSTANCE ID TO AUTOMATION FLOWS
-- ============================================================

-- Add instance_id column to automation_flows
ALTER TABLE automation_flows 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE;

-- If you want to force the instance_id, you can make it NOT NULL later 
-- if all existing data is backfilled, but for now we leave it nullable 
-- just in case some legacy flows exist or if it means "all instances" in some logic.
