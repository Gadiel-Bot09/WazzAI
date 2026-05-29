-- ============================================================
-- AUTOMATION FLOWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_flows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_type    TEXT NOT NULL DEFAULT 'keyword', -- 'keyword', 'welcome', 'both'
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  nodes           JSONB NOT NULL DEFAULT '[]',
  edges           JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FLOW STATES TABLE
-- (Tracks where a user is within a flow)
-- ============================================================

CREATE TABLE IF NOT EXISTS flow_states (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  flow_id         UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  current_node_id TEXT NOT NULL,
  state_data      JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id) -- A contact can only be in one active flow at a time
);
