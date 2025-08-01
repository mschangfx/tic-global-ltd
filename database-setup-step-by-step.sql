-- STEP 0: Fix transactions table constraint (URGENT FIX)
-- This fixes the payment processing error
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment'));

-- STEP 1: Create payment_plans table
-- Run this after Step 0

CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    duration_days INTEGER,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Create user_plan_subscriptions table
-- Run this after Step 1

CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    transaction_id UUID,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    payment_amount DECIMAL(18, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create indexes
-- Run this after Step 2

CREATE INDEX IF NOT EXISTS idx_payment_plans_plan_id ON payment_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_user_email ON user_plan_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_plan_id ON user_plan_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_status ON user_plan_subscriptions(status);

-- STEP 4: Insert payment plans
-- Run this after Step 3

INSERT INTO payment_plans (plan_id, name, description, price, currency, duration_days, features, is_active, sort_order, metadata) VALUES
(
    'starter',
    'Starter Plan',
    'Perfect for beginners entering the TIC ecosystem. Get essential access and start your journey.',
    10.00,
    'USD',
    30,
    '["500 TIC Tokens", "1st Level Community Earnings", "$138 Daily Unilevel Potential", "Basic Gaming Access", "Standard Support", "GIC Token Access"]',
    true,
    1,
    '{
        "ticTokens": "500",
        "communityEarnings": "1st Level",
        "dailyUnilevel": "$138 Potential",
        "gamingAccess": "Basic",
        "support": "Standard",
        "gicTokenAccess": true,
        "brandColor": "#14c3cb"
    }'
),
(
    'vip',
    'VIP Plan',
    'Premium experience with enhanced earning potential and exclusive benefits.',
    138.00,
    'USD',
    30,
    '["6900 TIC Tokens", "1st - 15th Level Community Earnings", "$1380 Daily Unilevel Potential", "Premium (All Titles) Gaming Access", "Exclusive VIP Channel Support", "GIC Token Access"]',
    true,
    2,
    '{
        "ticTokens": "6900",
        "communityEarnings": "1st - 15th Level",
        "dailyUnilevel": "$1380 Potential",
        "gamingAccess": "Premium (All Titles)",
        "support": "Exclusive VIP Channel",
        "gicTokenAccess": true,
        "brandColor": "#E0B528",
        "popular": true
    }'
)
ON CONFLICT (plan_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    duration_days = EXCLUDED.duration_days,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- STEP 5: Verify the setup
-- Run this to check everything was created correctly

SELECT 'payment_plans' as table_name, count(*) as record_count FROM payment_plans
UNION ALL
SELECT 'user_plan_subscriptions' as table_name, count(*) as record_count FROM user_plan_subscriptions;

-- Show the created plans
SELECT plan_id, name, price, currency, is_active FROM payment_plans ORDER BY sort_order;
