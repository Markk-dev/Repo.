-- ============================================
-- BrewCode Employees Table
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  program TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read employees
CREATE POLICY "Authenticated users can read employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial employee data
INSERT INTO public.employees (employee_id, name, position, program)
VALUES (
  '26-008-0005',
  'Mark Vincent Madrid',
  'Administrative Assistant',
  'SAHS'
)
ON CONFLICT (employee_id) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant access to authenticated role
GRANT SELECT ON public.employees TO authenticated;

COMMENT ON TABLE public.employees IS 'Employee directory for BrewCode portal';
