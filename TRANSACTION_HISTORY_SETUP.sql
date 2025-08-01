-- =====================================================
-- COMPLETE TRANSACTION HISTORY SETUP FOR TIC GLOBAL
-- =====================================================
-- This creates all necessary tables for transaction history to work
-- Run this in your Supabase SQL Editor

-- 1. Create user_wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    total_balance DECIMAL(18, 8) DEFAULT 0,
    tic_balance DECIMAL(18, 8) DEFAULT 0,
    gic_balance DECIMAL(18, 8) DEFAULT 0,
    staking_balance DECIMAL(18, 8) DEFAULT 0,
    pending_deposits DECIMAL(18, 8) DEFAULT 0,
    pending_withdrawals DECIMAL(18, 8) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create deposits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User Information
    user_email TEXT NOT NULL,
    user_id UUID,
    
    -- Deposit Details
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    method_id TEXT NOT NULL,
    method_name TEXT NOT NULL,
    network TEXT NOT NULL,
    
    -- Wallet Information
    deposit_address TEXT NOT NULL,
    user_wallet_address TEXT,
    wallet_address TEXT, -- Alias for compatibility
    
    -- Transaction Details
    transaction_hash TEXT,
    confirmation_count INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 1,
    
    -- Fees and Final Amount
    processing_fee DECIMAL(10,2) DEFAULT 0,
    network_fee DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(12,2),
    
    -- Status Management
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'received', 'confirmed', 'completed', 'rejected', 'expired', 'failed'
    )),
    
    -- Admin Management
    admin_notes TEXT,
    admin_email TEXT,
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Request Metadata
    user_agent TEXT,
    ip_address INET,
    request_metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 3. Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    method_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) DEFAULT 'crypto',
    network VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    wallet_address TEXT,
    min_amount DECIMAL(12,2) DEFAULT 0,
    max_amount DECIMAL(12,2),
    processing_fee_rate DECIMAL(5,4) DEFAULT 0,
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    processing_time VARCHAR(50) DEFAULT 'Instant - 24 hours',
    confirmation_blocks INTEGER DEFAULT 1,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create withdrawal_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id UUID NOT NULL,
    method_id VARCHAR(50) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    network VARCHAR(50),
    processing_fee DECIMAL(18, 8) DEFAULT 0,
    network_fee DECIMAL(18, 8) DEFAULT 0,
    final_amount DECIMAL(18, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    admin_notes TEXT,
    processed_by VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    blockchain_hash VARCHAR(100),
    confirmation_count INTEGER DEFAULT 0,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    request_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id TEXT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund', 'bonus')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    balance_before DECIMAL(18, 8) NOT NULL,
    balance_after DECIMAL(18, 8) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deposits_user_email ON public.deposits(user_email);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON public.deposits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_email ON public.withdrawal_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON public.withdrawal_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_wallets_email ON public.user_wallets(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_email ON public.wallet_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Everyone can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can create own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can create own withdrawals" ON public.withdrawal_requests;

-- Users can view their own data
CREATE POLICY "Users can view own wallet" ON public.user_wallets
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can view own deposits" ON public.deposits
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email OR auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Everyone can view payment methods" ON public.payment_methods
    FOR SELECT USING (true);

-- Users can create their own records
CREATE POLICY "Users can create own deposits" ON public.deposits
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create own withdrawals" ON public.withdrawal_requests
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- 9. Insert default payment methods
INSERT INTO public.payment_methods (method_id, name, network, symbol, wallet_address, min_amount, max_amount, processing_time)
VALUES
    ('usdt-trc20', 'USDT', 'TRC20', 'USDT', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 10.00, 10000.00, 'Instant - 24 hours')
ON CONFLICT (method_id) DO NOTHING;

-- 10. Create wallet management functions
CREATE OR REPLACE FUNCTION get_or_create_user_wallet(user_email_param VARCHAR(255))
RETURNS public.user_wallets AS $$
DECLARE
    wallet_record public.user_wallets;
BEGIN
    SELECT * INTO wallet_record FROM public.user_wallets WHERE user_email = user_email_param;
    
    IF NOT FOUND THEN
        INSERT INTO public.user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
        VALUES (user_email_param, 0, 0, 0, 0)
        RETURNING * INTO wallet_record;
    END IF;
    
    RETURN wallet_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create wallet credit function
CREATE OR REPLACE FUNCTION credit_user_wallet(
    user_email_param TEXT,
    amount_param DECIMAL,
    transaction_id_param TEXT,
    description_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18,8);
    new_balance DECIMAL(18,8);
    wallet_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        INSERT INTO public.user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
        VALUES (user_email_param, 0, 0, 0, 0);
        current_balance := 0;
    ELSE
        SELECT total_balance INTO current_balance FROM public.user_wallets WHERE user_email = user_email_param;
    END IF;
    
    new_balance := current_balance + amount_param;
    
    UPDATE public.user_wallets 
    SET total_balance = new_balance, last_updated = NOW()
    WHERE user_email = user_email_param;
    
    INSERT INTO public.wallet_transactions (
        user_email, transaction_id, transaction_type, amount,
        balance_before, balance_after, description, created_at
    ) VALUES (
        user_email_param, transaction_id_param, 'deposit', amount_param,
        current_balance, new_balance, description_param, NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- 12. Create automatic wallet crediting trigger
CREATE OR REPLACE FUNCTION credit_wallet_on_deposit_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM credit_user_wallet(
            NEW.user_email,
            COALESCE(NEW.final_amount, NEW.amount),
            NEW.id::text,
            CONCAT('Deposit completed: $', COALESCE(NEW.final_amount, NEW.amount), ' via ', NEW.method_name, ' (', NEW.network, ')')
        );
        
        RAISE NOTICE 'Wallet credited: $% for user % (deposit %)', COALESCE(NEW.final_amount, NEW.amount), NEW.user_email, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS credit_wallet_on_deposit_completion_trigger ON public.deposits;
CREATE TRIGGER credit_wallet_on_deposit_completion_trigger
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION credit_wallet_on_deposit_completion();

-- 13. Update final_amount for existing deposits
UPDATE public.deposits 
SET final_amount = amount - COALESCE(processing_fee, 0) - COALESCE(network_fee, 0)
WHERE final_amount IS NULL;

SELECT 'Transaction history setup completed successfully!' as result;
