-- Migration 014: Add image moderation content type for post image scanning

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'moderation_content_type'
      AND e.enumlabel = 'post_image'
  ) THEN
    ALTER TYPE public.moderation_content_type ADD VALUE 'post_image';
  END IF;
END
$$;
