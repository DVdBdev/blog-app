-- Migration 016: Allow admins to delete moderation log entries

DROP POLICY IF EXISTS "Admins can delete moderation log" ON public.moderation_log;
CREATE POLICY "Admins can delete moderation log"
  ON public.moderation_log
  FOR DELETE
  USING (public.is_admin());
