-- ============================================================
-- Migration 006: Public read access for journeys
-- ============================================================
-- Visibility semantics:
--   public   → anyone can view and it appears in public listings
--   unlisted → accessible via direct link (not listed publicly)
--   private  → only the owner can view
-- ============================================================

-- Drop existing SELECT policy that only allowed owners to read
DROP POLICY IF EXISTS "Users can view own journeys" ON public.journeys;

-- Public journeys and unlisted journeys are readable by anyone with the link.
-- RLS therefore permits SELECT when visibility is 'public' or 'unlisted'.
-- Private journeys are still readable by their owner.
CREATE POLICY "Public and unlisted journeys are viewable"
    ON public.journeys FOR SELECT
    USING (
        visibility IN ('public', 'unlisted')
        OR owner_id = auth.uid()
    );

-- INSERT: only authenticated owners can create journeys
DROP POLICY IF EXISTS "Users can create own journeys" ON public.journeys;
CREATE POLICY "Users can create own journeys"
    ON public.journeys FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- UPDATE: only the owner can edit
DROP POLICY IF EXISTS "Users can update own journeys" ON public.journeys;
CREATE POLICY "Users can update own journeys"
    ON public.journeys FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- DELETE: only the owner can delete
DROP POLICY IF EXISTS "Users can delete own journeys" ON public.journeys;
CREATE POLICY "Users can delete own journeys"
    ON public.journeys FOR DELETE
    USING (auth.uid() = owner_id);
