-- Drop the old restrictive SELECT policy that required authentication
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;

-- Published posts are readable by anyone (including unauthenticated users)
CREATE POLICY "Published posts are publicly readable"
    ON public.posts FOR SELECT
    USING (status = 'published');

-- Authors can read all their own posts, including drafts
CREATE POLICY "Authors can view their own posts"
    ON public.posts FOR SELECT
    USING (auth.uid() = author_id);
