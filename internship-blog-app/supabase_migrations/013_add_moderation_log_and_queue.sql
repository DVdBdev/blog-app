-- Migration 013: Moderation log infrastructure and admin queue support

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_content_type') THEN
    CREATE TYPE public.moderation_content_type AS ENUM (
      'username',
      'profile_bio',
      'journey_title',
      'journey_description',
      'post_title',
      'post_content'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_status') THEN
    CREATE TYPE public.moderation_status AS ENUM ('pending', 'reviewed', 'dismissed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type public.moderation_content_type NOT NULL,
  related_entity_id UUID NULL,
  flag_reason TEXT NULL,
  content_preview TEXT NOT NULL,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_log_user_id_idx ON public.moderation_log(user_id);
CREATE INDEX IF NOT EXISTS moderation_log_status_idx ON public.moderation_log(status);
CREATE INDEX IF NOT EXISTS moderation_log_created_at_idx ON public.moderation_log(created_at DESC);

DROP TRIGGER IF EXISTS handle_moderation_log_updated_at ON public.moderation_log;
CREATE TRIGGER handle_moderation_log_updated_at
  BEFORE UPDATE ON public.moderation_log
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view moderation log" ON public.moderation_log;
CREATE POLICY "Admins can view moderation log"
  ON public.moderation_log
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can create own moderation log entries" ON public.moderation_log;
CREATE POLICY "Users can create own moderation log entries"
  ON public.moderation_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update moderation status" ON public.moderation_log;
CREATE POLICY "Admins can update moderation status"
  ON public.moderation_log
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
