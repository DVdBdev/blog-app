-- Migration 011: Admin role + platform-wide admin permissions

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users or admins can update profiles" ON public.profiles;
CREATE POLICY "Users or admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Public and unlisted journeys are viewable" ON public.journeys;
CREATE POLICY "Public and unlisted journeys are viewable"
  ON public.journeys FOR SELECT
  USING (
    visibility IN ('public', 'unlisted')
    OR owner_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update their own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users can update own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users or admins can update journeys" ON public.journeys;
CREATE POLICY "Users or admins can update journeys"
  ON public.journeys FOR UPDATE
  USING (auth.uid() = owner_id OR public.is_admin())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete their own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users can delete own journeys" ON public.journeys;
DROP POLICY IF EXISTS "Users or admins can delete journeys" ON public.journeys;
CREATE POLICY "Users or admins can delete journeys"
  ON public.journeys FOR DELETE
  USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Published posts are publicly readable" ON public.posts;
CREATE POLICY "Published posts are publicly readable"
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Authors can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors or admins can view posts" ON public.posts;
CREATE POLICY "Authors or admins can view posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users or admins can update posts" ON public.posts;
CREATE POLICY "Users or admins can update posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users or admins can delete posts" ON public.posts;
CREATE POLICY "Users or admins can delete posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id OR public.is_admin());
