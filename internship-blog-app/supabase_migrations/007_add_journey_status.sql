-- Migration 007: Add journey status fields for timeline indicators
ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed'));

ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;
