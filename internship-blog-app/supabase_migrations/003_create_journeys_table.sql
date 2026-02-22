-- Create journeys table
CREATE TABLE IF NOT EXISTS public.journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own journeys"
    ON public.journeys FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own journeys"
    ON public.journeys FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own journeys"
    ON public.journeys FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own journeys"
    ON public.journeys FOR DELETE
    USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_journeys_updated_at
    BEFORE UPDATE ON public.journeys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
