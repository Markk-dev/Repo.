-- ============================================
-- BrewCode – Auth & Session Management Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================

-- Enable pgcrypto for gen_random_uuid and crypt/gen_salt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. Enhance employees table
-- ============================================

-- Add password_hash column (bcrypt hash stored here)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index on employee_id for fast lookups during login
CREATE INDEX IF NOT EXISTS idx_employees_employee_id
  ON public.employees (employee_id);

-- Update the existing employee with a hashed password
-- Password: 26-008-0005 (same as before, now hashed with pgcrypto bcrypt)
UPDATE public.employees
SET password_hash = crypt('26-008-0005', gen_salt('bf', 10))
WHERE employee_id = '26-008-0005'
  AND password_hash IS NULL;

-- ============================================
-- 2. Create user_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  session_key   TEXT NOT NULL UNIQUE,
  device_info   TEXT DEFAULT 'Unknown Device',
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_rotated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at    TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days') NOT NULL,
  is_valid      BOOLEAN DEFAULT true NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_key
  ON public.user_sessions (session_key)
  WHERE is_valid = true;

CREATE INDEX IF NOT EXISTS idx_sessions_employee_id
  ON public.user_sessions (employee_id)
  WHERE is_valid = true;

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON public.user_sessions (expires_at)
  WHERE is_valid = true;

-- RLS: Only allow read access through our functions (service role bypasses)
-- No direct client access to sessions table
CREATE POLICY "No direct access to sessions"
  ON public.user_sessions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Grant the service role (used by server-side code) full access
GRANT ALL ON public.user_sessions TO service_role;
GRANT SELECT, UPDATE ON public.employees TO service_role;

-- ============================================
-- 3. Function: Verify employee credentials
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_employee(
  p_employee_id TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  employee_id TEXT,
  name TEXT,
  position TEXT,
  program TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.position,
    e.program
  FROM public.employees e
  WHERE e.employee_id = p_employee_id
    AND e.is_active = true
    AND e.password_hash IS NOT NULL
    AND e.password_hash = crypt(p_password, e.password_hash);
END;
$$;

-- ============================================
-- 4. Function: Create session (single-device enforcement)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_session(
  p_employee_uuid UUID,
  p_device_info TEXT DEFAULT 'Unknown Device',
  p_ip_address INET DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_session_key TEXT;
BEGIN
  -- Step 1: Invalidate ALL existing sessions for this employee
  -- This enforces the single-device rule
  UPDATE public.user_sessions
  SET is_valid = false
  WHERE employee_id = p_employee_uuid
    AND is_valid = true;

  -- Step 2: Generate a new cryptographically secure session key
  -- Format: base64-encoded 48 random bytes = 64 chars
  v_session_key := encode(gen_random_bytes(48), 'base64');

  -- Step 3: Insert the new session
  INSERT INTO public.user_sessions (
    employee_id,
    session_key,
    device_info,
    ip_address,
    created_at,
    last_rotated_at,
    expires_at,
    is_valid
  ) VALUES (
    p_employee_uuid,
    v_session_key,
    p_device_info,
    p_ip_address,
    now(),
    now(),
    now() + INTERVAL '7 days',
    true
  );

  RETURN v_session_key;
END;
$$;

-- ============================================
-- 5. Function: Validate & rotate session
--    Returns session status + employee data
--    Silently rotates key if stale (>24h)
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_session(
  p_session_key TEXT
)
RETURNS TABLE (
  status TEXT,           -- 'valid', 'rotated', 'expired', 'invalid'
  new_session_key TEXT,  -- NULL unless rotated
  emp_id UUID,
  emp_employee_id TEXT,
  emp_name TEXT,
  emp_position TEXT,
  emp_program TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_session RECORD;
  v_new_key TEXT;
BEGIN
  -- Find the session
  SELECT
    s.id AS session_id,
    s.employee_id,
    s.last_rotated_at,
    s.expires_at,
    s.is_valid,
    e.id AS e_id,
    e.employee_id AS e_employee_id,
    e.name AS e_name,
    e.position AS e_position,
    e.program AS e_program,
    e.is_active AS e_is_active
  INTO v_session
  FROM public.user_sessions s
  JOIN public.employees e ON e.id = s.employee_id
  WHERE s.session_key = p_session_key;

  -- Session not found
  IF v_session IS NULL THEN
    RETURN QUERY SELECT
      'invalid'::TEXT, NULL::TEXT,
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Session invalidated or employee deactivated
  IF NOT v_session.is_valid OR NOT v_session.e_is_active THEN
    RETURN QUERY SELECT
      'invalid'::TEXT, NULL::TEXT,
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Session hard-expired (>7 days from creation)
  IF now() > v_session.expires_at THEN
    -- Mark as invalid
    UPDATE public.user_sessions
    SET is_valid = false
    WHERE session_key = p_session_key;

    RETURN QUERY SELECT
      'expired'::TEXT, NULL::TEXT,
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Session is stale (>24h since last rotation) — silently rotate
  IF now() > (v_session.last_rotated_at + INTERVAL '24 hours') THEN
    -- Generate new key
    v_new_key := encode(gen_random_bytes(48), 'base64');

    -- Update the session with the new key
    UPDATE public.user_sessions
    SET
      session_key = v_new_key,
      last_rotated_at = now()
    WHERE session_key = p_session_key
      AND is_valid = true;

    RETURN QUERY SELECT
      'rotated'::TEXT,
      v_new_key,
      v_session.e_id,
      v_session.e_employee_id,
      v_session.e_name,
      v_session.e_position,
      v_session.e_program;
    RETURN;
  END IF;

  -- Session is valid and fresh
  RETURN QUERY SELECT
    'valid'::TEXT,
    NULL::TEXT,
    v_session.e_id,
    v_session.e_employee_id,
    v_session.e_name,
    v_session.e_position,
    v_session.e_program;
END;
$$;

-- ============================================
-- 6. Function: Revoke session (logout)
-- ============================================

CREATE OR REPLACE FUNCTION public.revoke_session(
  p_session_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_valid = false
  WHERE session_key = p_session_key;
END;
$$;

-- ============================================
-- 7. Function: Cleanup expired sessions
--    Call via pg_cron or manually
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions
  WHERE is_valid = false
     OR expires_at < now()
  RETURNING 1 INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================
-- 8. Grant execute permissions
-- ============================================

-- These functions are called from server-side Next.js (via service_role key)
-- anon/authenticated should NOT call them directly
REVOKE EXECUTE ON FUNCTION public.verify_employee FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_session FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_session FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_session FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_employee TO service_role;
GRANT EXECUTE ON FUNCTION public.create_session TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_session TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_session TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions TO service_role;

-- ============================================
-- Done! Your session management schema is ready.
-- ============================================

COMMENT ON TABLE public.user_sessions IS 'Custom session tracking for BrewCode portal. Enforces single-device, 24h silent rotation, 7-day hard expiry.';
COMMENT ON FUNCTION public.verify_employee IS 'Verifies employee credentials against bcrypt-hashed password.';
COMMENT ON FUNCTION public.create_session IS 'Creates a new session, invalidating all previous sessions for the employee (single-device enforcement).';
COMMENT ON FUNCTION public.validate_session IS 'Validates a session key. Returns status: valid/rotated/expired/invalid. Silently rotates key if stale (>24h).';
COMMENT ON FUNCTION public.revoke_session IS 'Invalidates a session on logout.';
COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Purges expired and invalidated sessions. Safe to call from pg_cron.';
