ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT 'Mark';

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

CREATE INDEX IF NOT EXISTS idx_linked_accounts_employee_id
  ON public.linked_accounts (employee_id);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_email
  ON public.linked_accounts (email);

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own linked accounts" ON public.linked_accounts;
DROP POLICY IF EXISTS "Allow all on linked_accounts" ON public.linked_accounts;

CREATE POLICY "Allow all on linked_accounts"
  ON public.linked_accounts
  FOR ALL
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.linked_accounts TO postgres, anon, authenticated, service_role;

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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER linked_accounts_updated_at
  BEFORE UPDATE ON public.linked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.linked_accounts IS 'Linked social accounts (Google) for 2FA recovery and identity verification';
COMMENT ON COLUMN public.linked_accounts.employee_id IS 'Foreign key referencing public.employees(id)';
COMMENT ON COLUMN public.linked_accounts.is_verified IS 'True if Google account is verified for emergency account recovery';
