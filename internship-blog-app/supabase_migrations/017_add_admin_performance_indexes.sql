-- Improve admin/moderation query performance for common filters/sorts.

CREATE INDEX IF NOT EXISTS moderation_log_status_created_at_idx
  ON public.moderation_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS moderation_log_user_id_created_at_idx
  ON public.moderation_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS posts_author_id_created_at_idx
  ON public.posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journeys_owner_id_created_at_idx
  ON public.journeys(owner_id, created_at DESC);
