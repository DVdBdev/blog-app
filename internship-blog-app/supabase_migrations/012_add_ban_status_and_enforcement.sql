-- Migration 012: User moderation status (active/banned) and write enforcement

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'banned'));

CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_user() FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.id
     AND NOT public.is_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
     ) THEN
    RAISE EXCEPTION 'Not allowed to change role or status';
  END IF;

  IF public.is_admin()
     AND auth.uid() <> OLD.id
     AND OLD.role = 'admin'
     AND NEW.status = 'banned'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Admins cannot ban other admins';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS "Users can create own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users can insert their own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Active users can create own journeys" ON public.journeys;
CREATE POLICY "Active users can create own journeys"
  ON public.journeys FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND public.is_active_user());

DROP POLICY IF EXISTS "Users or admins can update journeys" ON public.journeys;
DROP POLICY IF EXISTS "Active users or admins can update journeys" ON public.journeys;
CREATE POLICY "Active users or admins can update journeys"
  ON public.journeys FOR UPDATE
  USING ((auth.uid() = owner_id OR public.is_admin()) AND public.is_active_user())
  WITH CHECK ((auth.uid() = owner_id OR public.is_admin()) AND public.is_active_user());

DROP POLICY IF EXISTS "Users or admins can delete journeys" ON public.journeys;
DROP POLICY IF EXISTS "Active users or admins can delete journeys" ON public.journeys;
CREATE POLICY "Active users or admins can delete journeys"
  ON public.journeys FOR DELETE
  USING ((auth.uid() = owner_id OR public.is_admin()) AND public.is_active_user());

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Active users can insert their own posts" ON public.posts;
CREATE POLICY "Active users can insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.is_active_user());

DROP POLICY IF EXISTS "Users or admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Active users or admins can update posts" ON public.posts;
CREATE POLICY "Active users or admins can update posts"
  ON public.posts FOR UPDATE
  USING ((auth.uid() = author_id OR public.is_admin()) AND public.is_active_user())
  WITH CHECK ((auth.uid() = author_id OR public.is_admin()) AND public.is_active_user());

DROP POLICY IF EXISTS "Users or admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Active users or admins can delete posts" ON public.posts;
CREATE POLICY "Active users or admins can delete posts"
  ON public.posts FOR DELETE
  USING ((auth.uid() = author_id OR public.is_admin()) AND public.is_active_user());
