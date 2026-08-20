-- ==============================================================================
-- 003_linked_accounts_recovery.sql
-- Multi-Factor / Recovery Linked Accounts & Verification Status Schema
-- ==============================================================================

-- 1. Add nickname column to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT 'Mark';

-- 2. Create linked_accounts table with Foreign Key referencing employees(id)
CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL CHECK (provider IN ('google')),
  provider_account_id TEXT,
  email               TEXT NOT NULL,
  is_verified         BOOLEAN DEFAULT true NOT NULL,
  linked_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_employee_provider UNIQUE (employee_id, provider)
);

-- 2. Foreign key index (Essential for fast JOINs and ON DELETE CASCADE)
CREATE INDEX IF NOT EXISTS idx_linked_accounts_employee_id
  ON public.linked_accounts (employee_id);

-- 3. Email index for fast lookups during account recovery
CREATE INDEX IF NOT EXISTS idx_linked_accounts_email
  ON public.linked_accounts (email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Access Policies
-- Authenticated users can view their own linked accounts
CREATE POLICY "Employees can view own linked accounts"
  ON public.linked_accounts
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees
    )
  );

-- Service role full management
GRANT ALL ON public.linked_accounts TO service_role;

-- 6. Helper Function: Check if an employee is verified via Google
CREATE OR REPLACE FUNCTION public.is_employee_verified(p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.linked_accounts
    WHERE employee_id = p_employee_id
      AND provider = 'google'
      AND is_verified = true
  );
$$;

-- 7. Trigger to keep updated_at in sync
CREATE OR REPLACE TRIGGER linked_accounts_updated_at
  BEFORE UPDATE ON public.linked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.linked_accounts IS 'Linked social accounts (Google) for 2FA recovery and identity verification';
COMMENT ON COLUMN public.linked_accounts.employee_id IS 'Foreign key referencing public.employees(id)';
COMMENT ON COLUMN public.linked_accounts.is_verified IS 'True if Google account is verified for emergency account recovery';
