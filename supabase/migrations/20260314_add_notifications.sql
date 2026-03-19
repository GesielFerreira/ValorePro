-- ============================================================
-- ValorePro — Notifications Table Migration
-- ============================================================
-- Run this migration in your Supabase SQL editor or via CLI
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('alert_triggered', 'purchase_completed', 'purchase_failed', 'price_drop', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Add triggered_at and best_product_url to price_alerts if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'triggered_at') THEN
        ALTER TABLE public.price_alerts ADD COLUMN triggered_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'best_product_url') THEN
        ALTER TABLE public.price_alerts ADD COLUMN best_product_url TEXT;
    END IF;
END $$;
