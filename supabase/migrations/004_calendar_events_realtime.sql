-- ==========================================================================
-- Migration 004: Calendar Events & Supabase Realtime
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL, -- Format: YYYY-MM-DD
  start_time  TEXT NOT NULL, -- Format: HH:MM (24h)
  end_time    TEXT NOT NULL, -- Format: HH:MM (24h)
  all_day     BOOLEAN DEFAULT false NOT NULL,
  guests      TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying by date and user
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events (date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to calendar_events" ON public.calendar_events;

CREATE POLICY "Allow all access to calendar_events"
  ON public.calendar_events
  FOR ALL
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

-- Grant table permissions
GRANT ALL ON public.calendar_events TO postgres, anon, authenticated, service_role;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- Enable Supabase Realtime replication on calendar_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'calendar_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  END IF;
END $$;

COMMENT ON TABLE public.calendar_events IS 'Shared schedule and calendar events with Supabase Realtime synchronization';
