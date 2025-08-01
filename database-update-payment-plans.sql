-- Complete Payment System Database Setup
-- This script creates all necessary tables and functions for the payment system

-- FIRST: Fix the transactions table constraint to allow 'payment' type
-- This is the main issue causing the error
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment'));

-- Create payment_plans table if it doesn't exist
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

-- Create user_plan_subscriptions table if it doesn't exist
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (plan_id) REFERENCES payment_plans(plan_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_plans_plan_id ON payment_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_plans_price ON payment_plans(price);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_user_email ON user_plan_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_plan_id ON user_plan_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_status ON user_plan_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_expires_at ON user_plan_subscriptions(expires_at);

-- Clear existing plans and add the correct ones
DELETE FROM payment_plans WHERE plan_id IN ('basic', 'premium', 'enterprise');

-- Insert the correct payment plans that match the frontend
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

-- Create the process_plan_payment database function
CREATE OR REPLACE FUNCTION process_plan_payment(
    user_email_param VARCHAR(255),
    plan_id_param VARCHAR(50),
    payment_amount_param DECIMAL(18, 8),
    transaction_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    plan_duration INTEGER;
BEGIN
    -- Get current wallet balance
    SELECT total_balance INTO current_balance
    FROM user_wallets
    WHERE user_email = user_email_param;

    -- Check if user has sufficient balance
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User wallet not found for email: %', user_email_param;
    END IF;

    IF current_balance < payment_amount_param THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', payment_amount_param, current_balance;
    END IF;

    -- Get plan duration
    SELECT duration_days INTO plan_duration
    FROM payment_plans
    WHERE plan_id = plan_id_param AND is_active = true;

    IF plan_duration IS NULL THEN
        RAISE EXCEPTION 'Plan not found or inactive: %', plan_id_param;
    END IF;

    -- Debit the wallet
    UPDATE user_wallets
    SET
        total_balance = total_balance - payment_amount_param,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Create or update user plan subscription
    INSERT INTO user_plan_subscriptions (
        user_email,
        plan_id,
        transaction_id,
        status,
        started_at,
        expires_at,
        payment_amount
    ) VALUES (
        user_email_param,
        plan_id_param,
        transaction_id_param,
        'active',
        NOW(),
        CASE
            WHEN plan_duration > 0 THEN NOW() + INTERVAL '1 day' * plan_duration
            ELSE NULL
        END,
        payment_amount_param
    )
    ON CONFLICT (user_email, plan_id)
    DO UPDATE SET
        transaction_id = transaction_id_param,
        status = 'active',
        started_at = NOW(),
        expires_at = CASE
            WHEN plan_duration > 0 THEN NOW() + INTERVAL '1 day' * plan_duration
            ELSE NULL
        END,
        payment_amount = payment_amount_param,
        updated_at = NOW();

    -- Update transaction status to completed
    UPDATE transactions
    SET
        status = 'completed',
        updated_at = NOW()
    WHERE id = transaction_id_param;

END;
$$;

-- Add unique constraint for user_plan_subscriptions to prevent duplicates
ALTER TABLE user_plan_subscriptions
ADD CONSTRAINT unique_user_plan
UNIQUE (user_email, plan_id);

-- Verify the plans were inserted correctly
SELECT plan_id, name, price, currency, is_active, features, metadata FROM payment_plans WHERE plan_id IN ('starter', 'vip') ORDER BY sort_order;
