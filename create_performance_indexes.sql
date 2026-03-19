-- Execution context: Supabase SQL Editor
-- Purpose: Create indexes on foreign keys to prevent full-table scans during dashboard load

-- 1. Index on purchases.user_id
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);

-- 2. Index on price_alerts.user_id
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);

-- 3. Index on search_history.user_id 
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);

-- 4. Index on addresses.user_id and cards.user_id (to speed up settings page)
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);

-- Done!
