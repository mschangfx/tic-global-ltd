-- Complete TIC Distribution System Setup
-- Run this in your Supabase SQL Editor to set up the entire TIC distribution system

-- 1. Create user_wallets table (renamed from wallets for consistency)
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    total_balance DECIMAL(18, 8) DEFAULT 0,
    tic_balance DECIMAL(18, 8) DEFAULT 0,
    gic_balance DECIMAL(18, 8) DEFAULT 0,
    staking_balance DECIMAL(18, 8) DEFAULT 0,
    partner_wallet_balance DECIMAL(18, 8) DEFAULT 0,
    pending_deposits DECIMAL(18, 8) DEFAULT 0,
    pending_withdrawals DECIMAL(18, 8) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create wallet_transactions table for transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255), -- Can be UUID or string
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    balance_before DECIMAL(18, 8) DEFAULT 0,
    balance_after DECIMAL(18, 8) DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create tic_distribution_log table for tracking distributions
CREATE TABLE IF NOT EXISTS tic_distribution_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    tic_amount DECIMAL(18, 8) NOT NULL,
    distribution_date DATE NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one distribution per user per day per plan
    UNIQUE(user_email, plan_id, distribution_date)
);

-- 4. Create subscription_plans table (renamed from payment_plans for TIC distribution)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    duration_days INTEGER,
    daily_tic_amount DECIMAL(18, 8) DEFAULT 0, -- Daily TIC distribution amount
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create user_subscriptions table (renamed from user_plan_subscriptions)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    transaction_id UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    payment_amount DECIMAL(18, 8),
    currency VARCHAR(10) DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to subscription_plans
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);

-- 6. Insert default subscription plans with TIC distribution amounts
INSERT INTO subscription_plans (plan_id, name, description, price, duration_days, daily_tic_amount, features, sort_order) VALUES
('starter', 'Starter Plan', 'Basic plan with daily TIC distribution - 500 TIC tokens per year', 29.99, 30, 1.37, '["Daily TIC Distribution", "Basic Trading", "Email Support"]', 1),
('vip', 'VIP Plan', 'Premium plan with higher TIC distribution - 6900 TIC tokens per year', 99.99, 30, 18.9, '["Higher Daily TIC Distribution", "Advanced Trading", "Priority Support", "API Access"]', 2)
ON CONFLICT (plan_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    duration_days = EXCLUDED.duration_days,
    daily_tic_amount = EXCLUDED.daily_tic_amount,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- 7. Create the TIC distribution function with correct signature
CREATE OR REPLACE FUNCTION increment_tic_balance_daily_distribution(
    user_email TEXT,
    tic_amount DECIMAL(18, 8),
    plan_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
    wallet_exists BOOLEAN;
    transaction_id_generated TEXT;
BEGIN
    -- Generate transaction ID
    transaction_id_generated := 'tic_dist_' || extract(epoch from now())::bigint || '_' || substring(md5(random()::text), 1, 8);
    
    -- Check if wallet exists
    SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_email = increment_tic_balance_daily_distribution.user_email) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        -- Create wallet if it doesn't exist
        INSERT INTO user_wallets (
            user_email, 
            total_balance, 
            tic_balance, 
            gic_balance, 
            staking_balance, 
            partner_wallet_balance,
            last_updated
        ) VALUES (
            increment_tic_balance_daily_distribution.user_email, 
            0, 
            0, 
            0, 
            0, 
            0,
            NOW()
        );
        current_balance := 0;
    ELSE
        -- Get current TIC balance
        SELECT COALESCE(tic_balance, 0) INTO current_balance
        FROM user_wallets
        WHERE user_email = increment_tic_balance_daily_distribution.user_email;
    END IF;

    -- Calculate new balance
    new_balance := current_balance + tic_amount;

    -- Update TIC balance
    UPDATE user_wallets
    SET
        tic_balance = new_balance,
        total_balance = total_balance + tic_amount,
        last_updated = NOW()
    WHERE user_email = increment_tic_balance_daily_distribution.user_email;

    -- Create transaction history record
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        currency,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
    ) VALUES (
        increment_tic_balance_daily_distribution.user_email,
        transaction_id_generated,
        'daily_distribution',
        tic_amount,
        'TIC',
        current_balance,
        new_balance,
        'Daily TIC distribution for ' || plan_id || ' plan',
        jsonb_build_object(
            'token_type', 'TIC', 
            'distribution_type', 'daily_plan_distribution',
            'plan_id', plan_id,
            'daily_amount', tic_amount
        ),
        NOW()
    );

    -- Log the distribution
    INSERT INTO tic_distribution_log (
        user_email,
        plan_id,
        tic_amount,
        distribution_date,
        transaction_id,
        status,
        metadata
    ) VALUES (
        increment_tic_balance_daily_distribution.user_email,
        increment_tic_balance_daily_distribution.plan_id,
        tic_amount,
        CURRENT_DATE,
        transaction_id_generated,
        'completed',
        jsonb_build_object(
            'distribution_time', NOW(),
            'function_version', '1.0'
        )
    ) ON CONFLICT (user_email, plan_id, distribution_date) DO NOTHING;

    RAISE NOTICE 'Updated TIC balance for %: % -> % (+% TIC)', 
        increment_tic_balance_daily_distribution.user_email, current_balance, new_balance, tic_amount;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_tic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_tic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_tic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT) TO service_role;

-- 9. Enable Row Level Security
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tic_distribution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
CREATE POLICY "Users can view own wallet" ON user_wallets
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can view own transactions" ON wallet_transactions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can view own distribution log" ON tic_distribution_log
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallets_email ON user_wallets(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_email ON wallet_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_tic_distribution_log_email ON tic_distribution_log(user_email);
CREATE INDEX IF NOT EXISTS idx_tic_distribution_log_date ON tic_distribution_log(distribution_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email ON user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 12. Verification queries
SELECT 'Setup completed successfully!' as status;
SELECT 'Tables created:' as info, count(*) as table_count FROM information_schema.tables 
WHERE table_name IN ('user_wallets', 'wallet_transactions', 'tic_distribution_log', 'subscription_plans', 'user_subscriptions');
SELECT 'Functions created:' as info, count(*) as function_count FROM information_schema.routines 
WHERE routine_name = 'increment_tic_balance_daily_distribution';
SELECT 'Subscription plans available:' as info, plan_id, name, daily_tic_amount FROM subscription_plans ORDER BY sort_order;
