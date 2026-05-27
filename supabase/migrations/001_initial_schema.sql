-- ============================================================
-- WazzAI — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'operator');
CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'closed');
CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'document', 'video', 'sticker', 'location', 'contact', 'reaction');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound', 'ai');
CREATE TYPE message_status AS ENUM ('sending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE ai_model AS ENUM ('gpt-4o', 'gpt-4o-mini', 'gemini-1.5-flash', 'gemini-1.5-pro');
CREATE TYPE ai_tone AS ENUM ('friendly', 'professional', 'formal');
CREATE TYPE ai_focus_mode AS ENUM ('attention', 'scheduling', 'both');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');
CREATE TYPE feature_request_status AS ENUM ('planned', 'in_progress', 'done', 'rejected');
CREATE TYPE whatsapp_instance_status AS ENUM ('connecting', 'connected', 'disconnected', 'qr_code');
CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE audit_action AS ENUM (
  'user.login', 'user.logout', 'user.invite', 'user.remove',
  'instance.create', 'instance.delete', 'instance.connect', 'instance.disconnect',
  'conversation.assign', 'conversation.close', 'conversation.reopen',
  'ai.config.update', 'knowledge.upload', 'knowledge.delete',
  'appointment.create', 'appointment.update', 'appointment.cancel',
  'subscription.upgrade', 'subscription.cancel', 'subscription.reactivate',
  'org.suspend', 'org.activate', 'org.settings.update',
  'plan.create', 'plan.update'
);

-- ============================================================
-- PLANS TABLE (no org dependency — seeded by platform)
-- ============================================================

CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,          -- 'starter', 'pro', 'business'
  display_name  TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly  DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly  TEXT,
  limits        JSONB NOT NULL DEFAULT '{
    "instances": 1,
    "messages_per_month": 1000,
    "operators": 2,
    "storage_gb": 1,
    "ai_responses_per_hour": 50,
    "knowledge_base_docs": 10,
    "kanban_columns": 5
  }',
  features      JSONB NOT NULL DEFAULT '[]',   -- array of feature strings
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  trial_days    INTEGER NOT NULL DEFAULT 14,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORGANIZATIONS TABLE (tenant root)
-- ============================================================

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  plan_id         UUID REFERENCES plans(id) ON DELETE SET NULL,
  logo_url        TEXT,
  website         TEXT,
  timezone        TEXT NOT NULL DEFAULT 'America/Mexico_City',
  locale          TEXT NOT NULL DEFAULT 'es',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended    BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS TABLE (org members)
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'operator',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ,
  notification_prefs JSONB NOT NULL DEFAULT '{
    "email_new_message": true,
    "email_appointment_reminder": true,
    "browser_push": false
  }',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================

CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES plans(id),
  stripe_sub_id       TEXT UNIQUE,
  stripe_customer_id  TEXT,
  status              subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle       TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  trial_start         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_end           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  canceled_at         TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP INSTANCES TABLE
-- ============================================================

CREATE TABLE whatsapp_instances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  display_name    TEXT,
  phone_number    TEXT,
  evolution_instance_id TEXT UNIQUE,        -- ID in Evolution API
  status          whatsapp_instance_status NOT NULL DEFAULT 'disconnected',
  qr_code         TEXT,                     -- base64 QR for scanning
  webhook_secret  TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_ai_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at    TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI CONFIGS TABLE (per instance)
-- ============================================================

CREATE TABLE ai_configs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id           UUID NOT NULL UNIQUE REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model                 ai_model NOT NULL DEFAULT 'gpt-4o-mini',
  tone                  ai_tone NOT NULL DEFAULT 'professional',
  focus_mode            ai_focus_mode NOT NULL DEFAULT 'both',
  system_prompt         TEXT,
  context_messages      INTEGER NOT NULL DEFAULT 10,   -- last N messages to include
  temperature           DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  transfer_keywords     TEXT[] NOT NULL DEFAULT ARRAY['humano', 'persona', 'agente', 'operador', 'help', 'ayuda'],
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  welcome_message       TEXT,
  fallback_message      TEXT DEFAULT 'Lo siento, no pude procesar tu mensaje. Un agente te atenderá pronto.',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTACTS TABLE
-- ============================================================

CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number    TEXT NOT NULL,
  name            TEXT,
  email           TEXT,
  avatar_url      TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',        -- custom fields
  is_blocked      BOOLEAN NOT NULL DEFAULT FALSE,
  last_contact_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, phone_number)
);

-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_id     UUID NOT NULL REFERENCES whatsapp_instances(id),
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  status          conversation_status NOT NULL DEFAULT 'open',
  is_ai_active    BOOLEAN NOT NULL DEFAULT FALSE,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  closed_at       TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id         UUID REFERENCES users(id) ON DELETE SET NULL,   -- NULL if inbound or AI
  evolution_msg_id  TEXT,                                           -- Evolution API message ID
  direction         message_direction NOT NULL,
  message_type      message_type NOT NULL DEFAULT 'text',
  content           TEXT,
  media_url         TEXT,
  media_mime_type   TEXT,
  media_size_bytes  INTEGER,
  media_filename    TEXT,
  status            message_status NOT NULL DEFAULT 'sent',
  is_internal_note  BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  metadata          JSONB NOT NULL DEFAULT '{}',
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE BASE TABLE (RAG)
-- ============================================================

CREATE TABLE knowledge_base (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_id     UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,  -- NULL = global for org
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  embedding       vector(1536),
  source_filename TEXT,
  source_url      TEXT,
  chunk_index     INTEGER NOT NULL DEFAULT 0,
  total_chunks    INTEGER NOT NULL DEFAULT 1,
  metadata        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICES TABLE
-- ============================================================

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  duration_min    INTEGER NOT NULL DEFAULT 60,
  price           DECIMAL(10,2),
  color           TEXT NOT NULL DEFAULT '#6366f1',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUSINESS HOURS TABLE (per instance)
-- ============================================================

CREATE TABLE business_hours (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id   UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday
  open_time     TIME NOT NULL DEFAULT '09:00',
  close_time    TIME NOT NULL DEFAULT '18:00',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instance_id, day_of_week)
);

-- ============================================================
-- BLOCKED DAYS TABLE (holidays / closures)
-- ============================================================

CREATE TABLE blocked_days (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id   UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  blocked_date  DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instance_id, blocked_date)
);

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================

CREATE TABLE appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id          UUID NOT NULL REFERENCES contacts(id),
  service_id          UUID REFERENCES services(id) ON DELETE SET NULL,
  assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
  instance_id         UUID REFERENCES whatsapp_instances(id),
  conversation_id     UUID REFERENCES conversations(id),
  title               TEXT NOT NULL,
  notes               TEXT,
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  timezone            TEXT NOT NULL DEFAULT 'America/Mexico_City',
  status              appointment_status NOT NULL DEFAULT 'pending',
  reminder_24h_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_1h_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  cancellation_reason TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KANBAN COLUMNS TABLE
-- ============================================================

CREATE TABLE kanban_columns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  position    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEADS TABLE
-- ============================================================

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  column_id       UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  instance_id     UUID REFERENCES whatsapp_instances(id),
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT,
  estimated_value DECIMAL(12,2),
  priority        lead_priority NOT NULL DEFAULT 'medium',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  position        DECIMAL NOT NULL DEFAULT 0,         -- float for reordering without gaps
  metadata        JSONB NOT NULL DEFAULT '{}',
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FEATURE REQUESTS TABLE (roadmap)
-- ============================================================

CREATE TABLE feature_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  status      feature_request_status NOT NULL DEFAULT 'planned',
  votes       INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes junction (one vote per user per feature)
CREATE TABLE feature_request_votes (
  feature_request_id  UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (feature_request_id, user_id)
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVITATIONS TABLE (team invites)
-- ============================================================

CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'operator',
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- ============================================================
-- USAGE TRACKING TABLE (for plan enforcement)
-- ============================================================

CREATE TABLE usage_counters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  messages_count  INTEGER NOT NULL DEFAULT 0,
  ai_responses    INTEGER NOT NULL DEFAULT 0,
  storage_bytes   BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, period_start)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan_id ON organizations(plan_id);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- Users
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Subscriptions
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_sub_id);

-- WhatsApp Instances
CREATE INDEX idx_whatsapp_instances_org_id ON whatsapp_instances(org_id);
CREATE INDEX idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX idx_whatsapp_instances_evolution_id ON whatsapp_instances(evolution_instance_id);

-- Contacts
CREATE INDEX idx_contacts_org_id ON contacts(org_id);
CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_last_contact ON contacts(last_contact_at DESC);

-- Conversations
CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_instance_id ON conversations(instance_id);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_composite ON conversations(org_id, status, last_message_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_evolution_id ON messages(evolution_msg_id);
CREATE INDEX idx_messages_composite ON messages(conversation_id, sent_at DESC);

-- Knowledge Base
CREATE INDEX idx_knowledge_base_org_id ON knowledge_base(org_id);
CREATE INDEX idx_knowledge_base_instance_id ON knowledge_base(instance_id);
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Appointments
CREATE INDEX idx_appointments_org_id ON appointments(org_id);
CREATE INDEX idx_appointments_contact_id ON appointments(contact_id);
CREATE INDEX idx_appointments_start_at ON appointments(start_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX idx_appointments_reminders ON appointments(start_at, reminder_24h_sent, reminder_1h_sent)
  WHERE status IN ('pending', 'confirmed');

-- Leads
CREATE INDEX idx_leads_org_id ON leads(org_id);
CREATE INDEX idx_leads_column_id ON leads(column_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_position ON leads(column_id, position);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- Audit Logs
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_composite ON audit_logs(org_id, created_at DESC);

-- Usage Counters
CREATE INDEX idx_usage_counters_org_period ON usage_counters(org_id, period_start);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations', 'users', 'plans', 'subscriptions',
    'whatsapp_instances', 'ai_configs', 'contacts', 'conversations',
    'knowledge_base', 'services', 'business_hours',
    'appointments', 'kanban_columns', 'leads', 'feature_requests',
    'usage_counters'
  ]
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================
-- RLS — Enable on all tables
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION — get current user's org_id
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_app_meta_data->>'platform_admin' = 'true'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES — ORGANIZATIONS
-- ============================================================

-- Users can read their own org
CREATE POLICY "org_select_own" ON organizations
  FOR SELECT USING (id = get_current_user_org_id());

-- Platform admins can read all
CREATE POLICY "org_select_admin" ON organizations
  FOR SELECT USING (is_platform_admin());

-- Owners can update their org
CREATE POLICY "org_update_owner" ON organizations
  FOR UPDATE USING (
    id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

-- Platform admins can update any org
CREATE POLICY "org_update_admin" ON organizations
  FOR UPDATE USING (is_platform_admin());

-- ============================================================
-- RLS POLICIES — USERS
-- ============================================================

CREATE POLICY "users_select_same_org" ON users
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "users_insert_owner_admin" ON users
  FOR INSERT WITH CHECK (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_update_owner_admin" ON users
  FOR UPDATE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "users_delete_owner" ON users
  FOR DELETE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() = 'owner'
    AND id != auth.uid()
  );

-- ============================================================
-- RLS POLICIES — PLANS (public read)
-- ============================================================

CREATE POLICY "plans_select_all" ON plans
  FOR SELECT USING (TRUE);

CREATE POLICY "plans_manage_admin" ON plans
  FOR ALL USING (is_platform_admin());

-- ============================================================
-- RLS POLICIES — SUBSCRIPTIONS
-- ============================================================

CREATE POLICY "subs_select_own_org" ON subscriptions
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "subs_select_admin" ON subscriptions
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "subs_update_admin" ON subscriptions
  FOR ALL USING (is_platform_admin());

-- Service role can update subscriptions (for Stripe webhooks)
CREATE POLICY "subs_service_role" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — WHATSAPP INSTANCES
-- ============================================================

CREATE POLICY "instances_select_own_org" ON whatsapp_instances
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "instances_insert_owner_admin" ON whatsapp_instances
  FOR INSERT WITH CHECK (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "instances_update_owner_admin" ON whatsapp_instances
  FOR UPDATE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "instances_delete_owner" ON whatsapp_instances
  FOR DELETE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() = 'owner'
  );

CREATE POLICY "instances_service_role" ON whatsapp_instances
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — AI CONFIGS
-- ============================================================

CREATE POLICY "ai_configs_select_own_org" ON ai_configs
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "ai_configs_manage_owner_admin" ON ai_configs
  FOR ALL USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "ai_configs_service_role" ON ai_configs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — CONTACTS
-- ============================================================

CREATE POLICY "contacts_select_own_org" ON contacts
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "contacts_insert_own_org" ON contacts
  FOR INSERT WITH CHECK (org_id = get_current_user_org_id());

CREATE POLICY "contacts_update_own_org" ON contacts
  FOR UPDATE USING (org_id = get_current_user_org_id());

CREATE POLICY "contacts_delete_owner_admin" ON contacts
  FOR DELETE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "contacts_service_role" ON contacts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — CONVERSATIONS
-- ============================================================

CREATE POLICY "conversations_select_own_org" ON conversations
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "conversations_insert_own_org" ON conversations
  FOR INSERT WITH CHECK (org_id = get_current_user_org_id());

CREATE POLICY "conversations_update_own_org" ON conversations
  FOR UPDATE USING (org_id = get_current_user_org_id());

CREATE POLICY "conversations_service_role" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — MESSAGES
-- ============================================================

CREATE POLICY "messages_select_own_org" ON messages
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "messages_insert_own_org" ON messages
  FOR INSERT WITH CHECK (org_id = get_current_user_org_id());

CREATE POLICY "messages_update_own_org" ON messages
  FOR UPDATE USING (org_id = get_current_user_org_id());

CREATE POLICY "messages_service_role" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — KNOWLEDGE BASE
-- ============================================================

CREATE POLICY "kb_select_own_org" ON knowledge_base
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "kb_manage_owner_admin" ON knowledge_base
  FOR ALL USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "kb_service_role" ON knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — SERVICES, BUSINESS HOURS, BLOCKED DAYS
-- ============================================================

CREATE POLICY "services_select_own_org" ON services
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "services_manage_owner_admin" ON services
  FOR ALL USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "biz_hours_select_own_org" ON business_hours
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "biz_hours_manage_owner_admin" ON business_hours
  FOR ALL USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "blocked_days_select_own_org" ON blocked_days
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "blocked_days_manage_owner_admin" ON blocked_days
  FOR ALL USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

-- ============================================================
-- RLS POLICIES — APPOINTMENTS
-- ============================================================

CREATE POLICY "appointments_select_own_org" ON appointments
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "appointments_insert_own_org" ON appointments
  FOR INSERT WITH CHECK (org_id = get_current_user_org_id());

CREATE POLICY "appointments_update_own_org" ON appointments
  FOR UPDATE USING (org_id = get_current_user_org_id());

CREATE POLICY "appointments_service_role" ON appointments
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — KANBAN COLUMNS & LEADS
-- ============================================================

CREATE POLICY "kanban_columns_select_own_org" ON kanban_columns
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "kanban_columns_manage_owner_admin" ON kanban_columns
  FOR ALL USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "leads_select_own_org" ON leads
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "leads_insert_own_org" ON leads
  FOR INSERT WITH CHECK (org_id = get_current_user_org_id());

CREATE POLICY "leads_update_own_org" ON leads
  FOR UPDATE USING (org_id = get_current_user_org_id());

CREATE POLICY "leads_delete_owner_admin" ON leads
  FOR DELETE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

-- ============================================================
-- RLS POLICIES — FEATURE REQUESTS & VOTES
-- ============================================================

-- Everyone can read feature requests
CREATE POLICY "feature_requests_select_all" ON feature_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create feature requests
CREATE POLICY "feature_requests_insert_auth" ON feature_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admins manage status
CREATE POLICY "feature_requests_manage_admin" ON feature_requests
  FOR UPDATE USING (is_platform_admin());

CREATE POLICY "votes_select_all" ON feature_request_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "votes_insert_own" ON feature_request_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "votes_delete_own" ON feature_request_votes
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- RLS POLICIES — AUDIT LOGS
-- ============================================================

CREATE POLICY "audit_select_own_org" ON audit_logs
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "audit_select_admin" ON audit_logs
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "audit_insert_service_role" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- ============================================================
-- RLS POLICIES — INVITATIONS
-- ============================================================

CREATE POLICY "invitations_select_own_org" ON invitations
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "invitations_insert_owner_admin" ON invitations
  FOR INSERT WITH CHECK (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "invitations_delete_owner_admin" ON invitations
  FOR DELETE USING (
    org_id = get_current_user_org_id()
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "invitations_service_role" ON invitations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES — USAGE COUNTERS
-- ============================================================

CREATE POLICY "usage_select_own_org" ON usage_counters
  FOR SELECT USING (org_id = get_current_user_org_id());

CREATE POLICY "usage_select_admin" ON usage_counters
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "usage_manage_service_role" ON usage_counters
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- DB FUNCTIONS
-- ============================================================

-- 1. RAG Search — match_documents
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding    vector(1536),
  match_threshold    FLOAT DEFAULT 0.7,
  match_count        INT DEFAULT 5,
  p_org_id           UUID DEFAULT NULL,
  p_instance_id      UUID DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  content     TEXT,
  similarity  FLOAT,
  metadata    JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity,
    kb.metadata
  FROM knowledge_base kb
  WHERE
    kb.is_active = TRUE
    AND (p_org_id IS NULL OR kb.org_id = p_org_id)
    AND (p_instance_id IS NULL OR kb.instance_id IS NULL OR kb.instance_id = p_instance_id)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Conversation Metrics
CREATE OR REPLACE FUNCTION get_conversation_metrics(
  p_org_id    UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  total_conversations     BIGINT,
  open_conversations      BIGINT,
  pending_conversations   BIGINT,
  closed_conversations    BIGINT,
  ai_resolved             BIGINT,
  avg_resolution_time_min NUMERIC,
  total_messages          BIGINT,
  inbound_messages        BIGINT,
  outbound_messages       BIGINT,
  ai_messages             BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id)                                                        AS total_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'open')                      AS open_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'pending')                   AS pending_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'closed')                    AS closed_conversations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.is_ai_active AND c.status = 'closed') AS ai_resolved,
    AVG(
      EXTRACT(EPOCH FROM (c.closed_at - c.created_at)) / 60
    ) FILTER (WHERE c.closed_at IS NOT NULL)                                   AS avg_resolution_time_min,
    COUNT(m.id)                                                                 AS total_messages,
    COUNT(m.id) FILTER (WHERE m.direction = 'inbound')                         AS inbound_messages,
    COUNT(m.id) FILTER (WHERE m.direction = 'outbound')                        AS outbound_messages,
    COUNT(m.id) FILTER (WHERE m.direction = 'ai')                              AS ai_messages
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
    AND m.created_at BETWEEN p_date_from AND p_date_to
  WHERE
    c.org_id = p_org_id
    AND c.created_at BETWEEN p_date_from AND p_date_to;
END;
$$;

-- 3. Messages per day time series
CREATE OR REPLACE FUNCTION get_messages_per_day(
  p_org_id    UUID,
  p_days_back INT DEFAULT 30
)
RETURNS TABLE (
  message_date DATE,
  total        BIGINT,
  inbound      BIGINT,
  outbound     BIGINT,
  ai           BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(m.sent_at)                                          AS message_date,
    COUNT(*)                                                 AS total,
    COUNT(*) FILTER (WHERE m.direction = 'inbound')          AS inbound,
    COUNT(*) FILTER (WHERE m.direction = 'outbound')         AS outbound,
    COUNT(*) FILTER (WHERE m.direction = 'ai')               AS ai
  FROM messages m
  WHERE
    m.org_id = p_org_id
    AND m.sent_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY DATE(m.sent_at)
  ORDER BY message_date;
END;
$$;

-- 4. Auto-close inactive conversations (for pg_cron)
CREATE OR REPLACE FUNCTION auto_close_inactive_conversations(
  inactivity_hours INT DEFAULT 24
)
RETURNS TABLE (
  closed_count  BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_closed BIGINT;
BEGIN
  UPDATE conversations
  SET
    status    = 'closed',
    closed_at = NOW(),
    updated_at = NOW()
  WHERE
    status IN ('open', 'pending')
    AND last_message_at < NOW() - (inactivity_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS v_closed = ROW_COUNT;

  RETURN QUERY SELECT v_closed;
END;
$$;

-- 5. Increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_org_id        UUID,
  p_messages      INT DEFAULT 0,
  p_ai_responses  INT DEFAULT 0,
  p_storage_bytes BIGINT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usage_counters (
    org_id, period_start, period_end,
    messages_count, ai_responses, storage_bytes
  )
  VALUES (
    p_org_id,
    DATE_TRUNC('month', NOW())::DATE,
    (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE,
    p_messages, p_ai_responses, p_storage_bytes
  )
  ON CONFLICT (org_id, period_start) DO UPDATE SET
    messages_count  = usage_counters.messages_count  + EXCLUDED.messages_count,
    ai_responses    = usage_counters.ai_responses    + EXCLUDED.ai_responses,
    storage_bytes   = usage_counters.storage_bytes   + EXCLUDED.storage_bytes,
    updated_at      = NOW();
END;
$$;

-- 6. Feature request vote toggle
CREATE OR REPLACE FUNCTION toggle_feature_vote(
  p_feature_id  UUID,
  p_user_id     UUID
)
RETURNS BOOLEAN  -- TRUE = voted, FALSE = unvoted
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM feature_request_votes
    WHERE feature_request_id = p_feature_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM feature_request_votes
    WHERE feature_request_id = p_feature_id AND user_id = p_user_id;

    UPDATE feature_requests SET votes = votes - 1 WHERE id = p_feature_id;
    RETURN FALSE;
  ELSE
    INSERT INTO feature_request_votes (feature_request_id, user_id)
    VALUES (p_feature_id, p_user_id);

    UPDATE feature_requests SET votes = votes + 1 WHERE id = p_feature_id;
    RETURN TRUE;
  END IF;
END;
$$;

-- ============================================================
-- pg_cron — Schedule auto-close every hour
-- ============================================================

SELECT cron.schedule(
  'auto-close-inactive-conversations',
  '0 * * * *',  -- every hour
  $$SELECT auto_close_inactive_conversations(24)$$
);

-- ============================================================
-- REALTIME CONFIGURATION
-- Enable realtime for chat tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_instances;

-- ============================================================
-- SEED DATA — Default Plans
-- ============================================================

INSERT INTO plans (name, display_name, price_monthly, price_yearly, limits, features, sort_order) VALUES
(
  'starter',
  'Starter',
  29.00,
  290.00,
  '{
    "instances": 1,
    "messages_per_month": 1000,
    "operators": 2,
    "storage_gb": 1,
    "ai_responses_per_hour": 20,
    "knowledge_base_docs": 5,
    "kanban_columns": 5
  }',
  '["1 instancia WhatsApp", "1,000 mensajes/mes", "2 operadores", "IA básica", "Agendamientos", "Kanban de leads"]',
  1
),
(
  'pro',
  'Pro',
  79.00,
  790.00,
  '{
    "instances": 5,
    "messages_per_month": 10000,
    "operators": 10,
    "storage_gb": 10,
    "ai_responses_per_hour": 100,
    "knowledge_base_docs": 50,
    "kanban_columns": 20
  }',
  '["5 instancias WhatsApp", "10,000 mensajes/mes", "10 operadores", "IA avanzada (GPT-4o)", "Base de conocimiento RAG", "Analíticas avanzadas", "Exportación CSV", "Recordatorios automáticos"]',
  2
),
(
  'business',
  'Business',
  199.00,
  1990.00,
  '{
    "instances": -1,
    "messages_per_month": -1,
    "operators": -1,
    "storage_gb": 100,
    "ai_responses_per_hour": -1,
    "knowledge_base_docs": -1,
    "kanban_columns": -1
  }',
  '["Instancias ilimitadas", "Mensajes ilimitados", "Operadores ilimitados", "Todos los modelos IA", "Base de conocimiento ilimitada", "Panel de admin", "API access", "SLA 99.9%", "Soporte prioritario"]',
  3
);
