-- Execution context: Supabase SQL Editor
-- Purpose: Creates a table to cache product search results and prevent repetitive SerpAPI billing

-- 1. Create the search history table
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index to optimize cache lookups by query speed and date
CREATE INDEX IF NOT EXISTS idx_search_history_query_created_at 
ON public.search_history (query, created_at DESC);

-- 3. Enable standard Row Level Security (RLS)
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- 4. Create policy so users can read only their own history from frontend (if used later)
CREATE POLICY "Users can read own search history" ON public.search_history
    FOR SELECT USING (auth.uid() = user_id);

-- 5. Service Role insertion policy (The NextJS backend uses the Service Key to insert, meaning this bypasses RLS naturally, but we add it for safety)
CREATE POLICY "Service can insert search history" ON public.search_history
    FOR INSERT WITH CHECK (true);

-- Done!
