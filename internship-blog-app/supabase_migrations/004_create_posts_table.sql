-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    excerpt TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS posts_journey_id_idx ON public.posts(journey_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own posts"
    ON public.posts FOR SELECT
    USING (auth.uid() = author_id);

CREATE POLICY "Users can insert their own posts"
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
    ON public.posts FOR DELETE
    USING (auth.uid() = author_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
