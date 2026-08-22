-- ==========================================================================
-- Migration 005: Add Remarks to Calendar Events
-- ==========================================================================

ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT '';
