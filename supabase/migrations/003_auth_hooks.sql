-- ============================================================
-- WazzAI — Auth Hook: Auto-create user profile
-- Migration: 003_auth_hooks.sql
--
-- When a new user signs up via Supabase Auth, this trigger
-- auto-creates their profile in public.users IF they were
-- invited (org_id is in metadata). Otherwise, the onboarding
-- flow will create the org + user profile.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id    UUID;
  v_role      user_role;
  v_inv_token TEXT;
  v_inv       invitations%ROWTYPE;
BEGIN
  -- Check if user signed up via invitation
  v_inv_token := NEW.raw_user_meta_data->>'invitation_token';

  IF v_inv_token IS NOT NULL THEN
    -- Find and validate the invitation
    SELECT * INTO v_inv
    FROM invitations
    WHERE token = v_inv_token
      AND accepted_at IS NULL
      AND expires_at > NOW();

    IF FOUND THEN
      v_org_id := v_inv.org_id;
      v_role   := v_inv.role;

      -- Create user profile
      INSERT INTO users (id, org_id, email, full_name, role)
      VALUES (
        NEW.id,
        v_org_id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        v_role
      )
      ON CONFLICT (id) DO NOTHING;

      -- Mark invitation as accepted
      UPDATE invitations
      SET accepted_at = NOW()
      WHERE token = v_inv_token;

      -- Log the action
      INSERT INTO audit_logs (org_id, user_id, action, metadata)
      VALUES (
        v_org_id,
        NEW.id,
        'user.login',
        jsonb_build_object('method', 'invitation', 'email', NEW.email)
      );
    END IF;
  END IF;

  -- Note: if no invitation, user profile is created during onboarding flow
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- Auth Hook: Update last_seen_at on login
-- ============================================================

CREATE OR REPLACE FUNCTION handle_auth_user_signin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET last_seen_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Function: Create organization with owner user
-- Called from server action during onboarding
-- ============================================================

CREATE OR REPLACE FUNCTION create_organization_with_owner(
  p_user_id     UUID,
  p_user_email  TEXT,
  p_user_name   TEXT,
  p_org_name    TEXT,
  p_org_slug    TEXT,
  p_timezone    TEXT DEFAULT 'America/Mexico_City',
  p_locale      TEXT DEFAULT 'es'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org         organizations%ROWTYPE;
  v_plan        plans%ROWTYPE;
  v_sub         subscriptions%ROWTYPE;
BEGIN
  -- Get the starter plan
  SELECT * INTO v_plan FROM plans WHERE name = 'starter' LIMIT 1;

  -- Create the organization
  INSERT INTO organizations (name, slug, plan_id, timezone, locale)
  VALUES (p_org_name, p_org_slug, v_plan.id, p_timezone, p_locale)
  RETURNING * INTO v_org;

  -- Create the subscription (trial)
  INSERT INTO subscriptions (org_id, plan_id, status, trial_start, trial_end)
  VALUES (
    v_org.id,
    v_plan.id,
    'trialing',
    NOW(),
    NOW() + INTERVAL '14 days'
  )
  RETURNING * INTO v_sub;

  -- Create the user as owner
  INSERT INTO users (id, org_id, email, full_name, role)
  VALUES (p_user_id, v_org.id, p_user_email, p_user_name, 'owner')
  ON CONFLICT (id) DO UPDATE
    SET org_id = v_org.id, role = 'owner';

  -- Log the action
  INSERT INTO audit_logs (org_id, user_id, action, metadata)
  VALUES (
    v_org.id,
    p_user_id,
    'org.settings.update',
    jsonb_build_object('action', 'create', 'org_name', p_org_name)
  );

  RETURN json_build_object(
    'org_id', v_org.id,
    'org_slug', v_org.slug,
    'plan_name', v_plan.name,
    'trial_end', v_sub.trial_end
  );
END;
$$;
