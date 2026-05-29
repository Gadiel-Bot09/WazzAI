-- Migration 002: Conversation Actions Tables
-- Run this in Supabase SQL Editor

-- ============================================================
-- SATISFACTION SURVEYS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  score            INTEGER CHECK (score BETWEEN 1 AND 5),
  comment          TEXT,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'sent',  -- sent | responded | expired
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- RLS policy: org members can read their own surveys
CREATE POLICY "org_members_satisfaction_surveys" ON satisfaction_surveys
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'platform_admin' = 'true')
  );

-- ============================================================
-- CANNED MESSAGES TABLE (Respuestas predefinidas)
-- ============================================================
CREATE TABLE IF NOT EXISTS canned_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  shortcut     TEXT,
  content      TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE canned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_canned_messages" ON canned_messages
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'platform_admin' = 'true')
  );

-- ============================================================
-- REMINDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  message          TEXT NOT NULL,
  remind_at        TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',   -- pending | sent | cancelled
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_reminders" ON reminders
  FOR ALL USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'platform_admin' = 'true')
  );
