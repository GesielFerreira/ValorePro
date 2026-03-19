-- ============================================================
-- ValorePro — Subscriptions Migration
-- ============================================================
-- Tabela de assinaturas para gerenciar planos de pagamento
-- ============================================================

CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
    status subscription_status NOT NULL DEFAULT 'active',

    -- Pagar.me integration (ready for future use)
    pagarme_subscription_id TEXT,
    pagarme_customer_id TEXT,

    -- Card used for billing
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,

    -- Billing period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_subscription" ON subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "users_insert_own_subscription" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "users_update_own_subscription" ON subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Index for fast lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Update the users.plan column when subscription changes
CREATE OR REPLACE FUNCTION sync_user_plan()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET plan = NEW.plan::user_plan,
        searches_limit = CASE
            WHEN NEW.plan = 'pro' THEN 100
            WHEN NEW.plan = 'premium' THEN 300
            ELSE 5
        END,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_subscription_change
    AFTER INSERT OR UPDATE OF plan, status ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION sync_user_plan();
