-- ==========================================================================
-- Migration 006: Sections, Discussions, Members, and Realtime Messages
-- ==========================================================================

-- 1. Create Sections Table (Categories)
CREATE TABLE IF NOT EXISTS public.sections (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create Discussions Table (Channels under Sections)
CREATE TABLE IF NOT EXISTS public.discussions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id      UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  topic           TEXT DEFAULT '',
  is_announcement BOOLEAN DEFAULT false NOT NULL,
  order_index     INTEGER DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create Discussion Members Table (Access Control)
CREATE TABLE IF NOT EXISTS public.discussion_members (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'member' NOT NULL, -- 'admin' | 'moderator' | 'member'
  joined_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_discussion_employee UNIQUE (discussion_id, employee_id)
);

-- 4. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  attachments   JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sections_order 
  ON public.sections (order_index ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_discussions_section_order 
  ON public.discussions (section_id, order_index ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_discussion_members_lookup 
  ON public.discussion_members (discussion_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_messages_discussion_created 
  ON public.messages (discussion_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_employee 
  ON public.messages (employee_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Allow all access to sections" ON public.sections;
CREATE POLICY "Allow all access to sections"
  ON public.sections FOR ALL TO authenticated, anon, service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to discussions" ON public.discussions;
CREATE POLICY "Allow all access to discussions"
  ON public.discussions FOR ALL TO authenticated, anon, service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to discussion_members" ON public.discussion_members;
CREATE POLICY "Allow all access to discussion_members"
  ON public.discussion_members FOR ALL TO authenticated, anon, service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;
CREATE POLICY "Allow all access to messages"
  ON public.messages FOR ALL TO authenticated, anon, service_role
  USING (true) WITH CHECK (true);

-- 8. Permissions
GRANT ALL ON public.sections TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.discussions TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.discussion_members TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.messages TO postgres, anon, authenticated, service_role;

-- 9. Updated At Trigger
CREATE OR REPLACE FUNCTION update_discussion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION update_discussion_updated_at();

CREATE OR REPLACE TRIGGER discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION update_discussion_updated_at();

CREATE OR REPLACE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_discussion_updated_at();

-- 10. Enable Supabase Realtime Replication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'discussions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
  END IF;
END $$;

-- 11. No default seeded data (sections and discussions are managed by department admins)
