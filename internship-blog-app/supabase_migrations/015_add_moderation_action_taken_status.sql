-- Migration 015: Add action_taken status for moderation enforcement actions

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'moderation_status'
      AND e.enumlabel = 'action_taken'
  ) THEN
    ALTER TYPE public.moderation_status ADD VALUE 'action_taken';
  END IF;
END
$$;
