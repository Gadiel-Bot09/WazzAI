-- ============================================================
-- Migration 006: Add media fields to messages, instance_name lookup
-- ============================================================

-- Add media_type column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add message_type if not present
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';

-- Add sent_at index if missing (for performance)
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);

-- Add instance_name as alias column in whatsapp_instances for easier lookup by Evolution name
-- The Evolution instance name is stored as name in the form "wazzai_<uuid_no_dashes>"
-- This index will speed up the name lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_name ON whatsapp_instances(name);
