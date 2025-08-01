-- COMPLETE PAYMENT SYSTEM SETUP
-- This creates a dedicated payment system separate from deposits/withdrawals

-- STEP 1: Create payment_plans table
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

-- STEP 2: Create payment_transactions table (dedicated for plan purchases)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50) DEFAULT 'wallet_balance',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Wallet balance tracking
    wallet_balance_before DECIMAL(18, 8),
    wallet_balance_after DECIMAL(18, 8),
    
    -- Plan details
    plan_duration_days INTEGER,
    plan_features JSONB DEFAULT '[]',
    plan_metadata JSONB DEFAULT '{}',
    
    -- Transaction metadata
    user_ip_address INET,
    user_agent TEXT,
    request_metadata JSONB DEFAULT '{}',
    
    -- Admin fields
    admin_notes TEXT,
    processed_by VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- STEP 3: Create user_plan_subscriptions table
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
    UNIQUE(user_email, plan_id)
);

-- STEP 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_plans_plan_id ON payment_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_email ON payment_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_plan_id ON payment_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_user_email ON user_plan_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_plan_id ON user_plan_subscriptions(plan_id);

-- STEP 5: Insert payment plans
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
    '{"ticTokens": "500", "communityEarnings": "1st Level", "dailyUnilevel": "$138 Potential", "gamingAccess": "Basic", "support": "Standard", "gicTokenAccess": true, "brandColor": "#14c3cb"}'
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
    '{"ticTokens": "6900", "communityEarnings": "1st - 15th Level", "dailyUnilevel": "$1380 Potential", "gamingAccess": "Premium (All Titles)", "support": "Exclusive VIP Channel", "gicTokenAccess": true, "brandColor": "#E0B528", "popular": true}'
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

-- STEP 6: Create payment processing function
CREATE OR REPLACE FUNCTION process_plan_payment_v2(
    user_email_param VARCHAR(255),
    plan_id_param VARCHAR(50),
    payment_amount_param DECIMAL(18, 8)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    plan_record RECORD;
    payment_transaction_id UUID;
    new_balance DECIMAL(18, 8);
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
    
    -- Get plan details
    SELECT * INTO plan_record
    FROM payment_plans
    WHERE plan_id = plan_id_param AND is_active = true;
    
    IF plan_record IS NULL THEN
        RAISE EXCEPTION 'Plan not found or inactive: %', plan_id_param;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - payment_amount_param;
    
    -- Create payment transaction record
    INSERT INTO payment_transactions (
        user_email,
        plan_id,
        plan_name,
        amount,
        currency,
        wallet_balance_before,
        wallet_balance_after,
        plan_duration_days,
        plan_features,
        plan_metadata,
        status,
        completed_at
    ) VALUES (
        user_email_param,
        plan_id_param,
        plan_record.name,
        payment_amount_param,
        plan_record.currency,
        current_balance,
        new_balance,
        plan_record.duration_days,
        plan_record.features,
        plan_record.metadata,
        'completed',
        NOW()
    ) RETURNING id INTO payment_transaction_id;
    
    -- Debit the wallet
    UPDATE user_wallets
    SET 
        total_balance = new_balance,
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
        payment_transaction_id,
        'active',
        NOW(),
        CASE 
            WHEN plan_record.duration_days > 0 THEN NOW() + INTERVAL '1 day' * plan_record.duration_days
            ELSE NULL
        END,
        payment_amount_param
    )
    ON CONFLICT (user_email, plan_id) 
    DO UPDATE SET
        transaction_id = payment_transaction_id,
        status = 'active',
        started_at = NOW(),
        expires_at = CASE 
            WHEN plan_record.duration_days > 0 THEN NOW() + INTERVAL '1 day' * plan_record.duration_days
            ELSE NULL
        END,
        payment_amount = payment_amount_param,
        updated_at = NOW();
    
    RETURN payment_transaction_id;
END;
$$;

-- STEP 7: Verify setup
SELECT 'Payment system setup completed successfully!' as status;

-- Show created plans
SELECT plan_id, name, price, currency, is_active FROM payment_plans ORDER BY sort_order;
