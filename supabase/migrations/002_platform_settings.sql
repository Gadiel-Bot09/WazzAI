-- ============================================================
-- WazzAI — Migration: 002_platform_settings.sql
-- ============================================================

CREATE TABLE platform_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key             TEXT NOT NULL UNIQUE,
  value           JSONB NOT NULL,
  description     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with initial settings
INSERT INTO platform_settings (key, value, description)
VALUES (
  'support_contact',
  '{"whatsapp_number": "573012929983", "message_template": "Hola, me gustaría solicitar la clave de licencia para mi cuenta WazzAI. Mi ID de Organización es: {{org_id}}"}'::jsonb,
  'Configuración de contacto de soporte para activación de cuentas'
);
