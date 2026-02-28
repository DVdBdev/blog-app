-- Helps ownership-scoped post mutations and checks.
CREATE INDEX IF NOT EXISTS posts_author_id_id_idx
  ON public.posts(author_id, id);
