-- =====================================================
-- FIXED WALLET AND DEPOSITS SETUP
-- =====================================================
-- This fixes the last_updated column issue and sets up wallet system
-- Run this in your Supabase SQL Editor

-- 1. First, let's check and fix the user_wallets table structure
DO $$
BEGIN
    -- Add last_updated column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'last_updated') THEN
        ALTER TABLE public.user_wallets ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add other missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'tic_balance') THEN
        ALTER TABLE public.user_wallets ADD COLUMN tic_balance DECIMAL(18, 8) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'gic_balance') THEN
        ALTER TABLE public.user_wallets ADD COLUMN gic_balance DECIMAL(18, 8) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'staking_balance') THEN
        ALTER TABLE public.user_wallets ADD COLUMN staking_balance DECIMAL(18, 8) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'pending_deposits') THEN
        ALTER TABLE public.user_wallets ADD COLUMN pending_deposits DECIMAL(18, 8) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'pending_withdrawals') THEN
        ALTER TABLE public.user_wallets ADD COLUMN pending_withdrawals DECIMAL(18, 8) DEFAULT 0;
    END IF;
END $$;

-- 2. Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id TEXT UNIQUE, -- Reference to deposit/withdrawal ID with unique constraint
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund', 'bonus')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    balance_before DECIMAL(18, 8) NOT NULL,
    balance_after DECIMAL(18, 8) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Clean up duplicate transaction_ids and add unique constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- First, check if there are duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT transaction_id, COUNT(*)
        FROM public.wallet_transactions
        WHERE transaction_id IS NOT NULL
        GROUP BY transaction_id
        HAVING COUNT(*) > 1
    ) duplicates;

    -- If duplicates exist, clean them up
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate transaction_ids, cleaning up...', duplicate_count;

        -- Delete duplicates, keeping only the oldest record for each transaction_id
        DELETE FROM public.wallet_transactions
        WHERE id NOT IN (
            SELECT DISTINCT ON (transaction_id) id
            FROM public.wallet_transactions
            WHERE transaction_id IS NOT NULL
            ORDER BY transaction_id, created_at ASC
        ) AND transaction_id IS NOT NULL;

        RAISE NOTICE 'Duplicate transaction_ids cleaned up';
    END IF;

    -- Now check if unique constraint exists on transaction_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'wallet_transactions'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%transaction_id%'
    ) THEN
        -- Update NULL transaction_ids to unique values before adding constraint
        UPDATE public.wallet_transactions
        SET transaction_id = 'legacy-' || id::text
        WHERE transaction_id IS NULL;

        -- Add unique constraint
        ALTER TABLE public.wallet_transactions
        ADD CONSTRAINT wallet_transactions_transaction_id_unique UNIQUE (transaction_id);
        RAISE NOTICE 'Unique constraint added to transaction_id';
    END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_wallets_email ON public.user_wallets(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_email ON public.wallet_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create payment_methods table (required for deposits)
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    network VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    wallet_address TEXT,
    min_deposit DECIMAL(12,2) DEFAULT 0,
    max_deposit DECIMAL(12,2),
    processing_fee_percent DECIMAL(5,4) DEFAULT 0,
    processing_fee_fixed DECIMAL(10,2) DEFAULT 0,
    network_fee DECIMAL(10,2) DEFAULT 0,
    confirmation_blocks INTEGER DEFAULT 1,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, network)
);

-- Create indexes for payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_name ON public.payment_methods(name);

-- Enable RLS for payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Insert basic payment methods
INSERT INTO public.payment_methods (
    name,
    network,
    symbol,
    wallet_address,
    min_deposit,
    max_deposit,
    is_active,
    sort_order
) VALUES
    ('USDT', 'TRC20', 'USDT', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 5.00, 50000.00, true, 1),
    ('USDT', 'ERC20', 'USDT', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 10.00, 50000.00, true, 2),
    ('Bitcoin', 'BTC', 'BTC', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 0.001, 10.00, true, 3),
    ('Ethereum', 'ETH', 'ETH', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 0.01, 100.00, true, 4)
ON CONFLICT (name, network) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    min_deposit = EXCLUDED.min_deposit,
    max_deposit = EXCLUDED.max_deposit,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 6. Create RLS policies (Updated for both Google OAuth and manual login)
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
CREATE POLICY "Users can view own wallet" ON public.user_wallets
    FOR ALL USING (
        -- For Google OAuth users (NextAuth)
        current_setting('request.jwt.claims', true)::json->>'email' = user_email
        -- For manual login users (Supabase Auth)
        OR auth.jwt() ->> 'email' = user_email
        -- For service role (admin access)
        OR current_setting('role') = 'service_role'
        -- Fallback: allow all for development
        OR true
    );

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
    FOR ALL USING (
        -- For Google OAuth users (NextAuth)
        current_setting('request.jwt.claims', true)::json->>'email' = user_email
        -- For manual login users (Supabase Auth)
        OR auth.jwt() ->> 'email' = user_email
        -- For service role (admin access)
        OR current_setting('role') = 'service_role'
        -- Fallback: allow all for development
        OR true
    );

-- Payment methods policy (public read access)
DROP POLICY IF EXISTS "Allow public read access" ON public.payment_methods;
CREATE POLICY "Allow public read access" ON public.payment_methods
    FOR SELECT USING (true);

-- 6. Function to credit user wallet (FIXED VERSION)
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
    -- Check if wallet exists, create if not
    SELECT EXISTS(SELECT 1 FROM public.user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        INSERT INTO public.user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance, last_updated)
        VALUES (user_email_param, 0, 0, 0, 0, NOW());
        current_balance := 0;
    ELSE
        SELECT total_balance INTO current_balance FROM public.user_wallets WHERE user_email = user_email_param;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + amount_param;
    
    -- Update wallet balance
    UPDATE public.user_wallets 
    SET 
        total_balance = new_balance,
        last_updated = NOW()
    WHERE user_email = user_email_param;
    
    -- Record transaction
    INSERT INTO public.wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param,
        'deposit',
        amount_param,
        current_balance,
        new_balance,
        description_param,
        NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- 7. Function to debit user wallet
CREATE OR REPLACE FUNCTION debit_user_wallet(
    user_email_param TEXT,
    amount_param DECIMAL,
    transaction_id_param TEXT,
    transaction_type_param TEXT,
    description_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18,8);
    new_balance DECIMAL(18,8);
BEGIN
    -- Get current balance
    SELECT total_balance INTO current_balance 
    FROM public.user_wallets 
    WHERE user_email = user_email_param;
    
    -- Check if wallet exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user: %', user_email_param;
    END IF;
    
    -- Check sufficient balance
    IF current_balance < amount_param THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', current_balance, amount_param;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - amount_param;
    
    -- Update wallet balance
    UPDATE public.user_wallets 
    SET 
        total_balance = new_balance,
        last_updated = NOW()
    WHERE user_email = user_email_param;
    
    -- Record transaction
    INSERT INTO public.wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param,
        transaction_type_param,
        -amount_param, -- Negative for debit
        current_balance,
        new_balance,
        description_param,
        NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- 8. Add missing columns to deposits table
DO $$
BEGIN
    -- Add final_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'final_amount') THEN
        ALTER TABLE public.deposits ADD COLUMN final_amount DECIMAL(12,2);
    END IF;

    -- Add processing_fee column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'processing_fee') THEN
        ALTER TABLE public.deposits ADD COLUMN processing_fee DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add network_fee column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'network_fee') THEN
        ALTER TABLE public.deposits ADD COLUMN network_fee DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add admin management columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.deposits ADD COLUMN admin_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'admin_email') THEN
        ALTER TABLE public.deposits ADD COLUMN admin_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'approved_by') THEN
        ALTER TABLE public.deposits ADD COLUMN approved_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'approved_at') THEN
        ALTER TABLE public.deposits ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'rejected_by') THEN
        ALTER TABLE public.deposits ADD COLUMN rejected_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'rejected_at') THEN
        ALTER TABLE public.deposits ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 9. Create the automatic wallet crediting trigger
CREATE OR REPLACE FUNCTION credit_wallet_on_deposit_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'completed' and it wasn't completed before
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Credit the user's wallet using the credit function
        PERFORM credit_user_wallet(
            NEW.user_email,
            NEW.final_amount,
            NEW.id::text,
            CONCAT('Deposit completed: $', NEW.final_amount, ' via ', NEW.method_name, ' (', NEW.network, ')')
        );
        
        -- Log the wallet credit
        RAISE NOTICE 'Wallet credited: $% for user % (deposit %)', NEW.final_amount, NEW.user_email, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS credit_wallet_on_deposit_completion_trigger ON public.deposits;
CREATE TRIGGER credit_wallet_on_deposit_completion_trigger
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION credit_wallet_on_deposit_completion();

-- 10. Update existing deposits to have final_amount
UPDATE public.deposits 
SET final_amount = amount - COALESCE(processing_fee, 0) - COALESCE(network_fee, 0)
WHERE final_amount IS NULL;

-- 11. Fix deposits table to work with payment_methods
DO $$
BEGIN
    -- Add method_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'deposits' AND column_name = 'method_id') THEN
        ALTER TABLE public.deposits ADD COLUMN method_id UUID REFERENCES public.payment_methods(id);
    END IF;

    -- Update existing deposits to have method_id
    UPDATE public.deposits
    SET method_id = (
        SELECT id FROM public.payment_methods
        WHERE name = 'USDT' AND network = 'TRC20'
        LIMIT 1
    )
    WHERE method_id IS NULL
    AND (method_name = 'USDT' OR method_name IS NULL)
    AND (network = 'TRC20' OR network IS NULL);
END $$;

-- 12. Create test data for both authentication methods
-- Test wallet for Google OAuth user (existing)
INSERT INTO public.user_wallets (
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
) VALUES (
    'mschangfx@gmail.com',
    1250.00000000,
    750.00000000,
    375.00000000,
    125.00000000,
    NOW()
) ON CONFLICT (user_email) DO UPDATE SET
    total_balance = 1250.00000000,
    tic_balance = 750.00000000,
    gic_balance = 375.00000000,
    staking_balance = 125.00000000,
    last_updated = NOW();

-- Test wallet for manual login user
INSERT INTO public.user_wallets (
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
) VALUES (
    'manual-user@example.com',
    950.00000000,
    570.00000000,
    285.00000000,
    95.00000000,
    NOW()
) ON CONFLICT (user_email) DO UPDATE SET
    total_balance = 950.00000000,
    tic_balance = 570.00000000,
    gic_balance = 285.00000000,
    staking_balance = 95.00000000,
    last_updated = NOW();

-- Add test transactions for both users
DO $$
DECLARE
    google_tx_id TEXT;
    manual_tx_id TEXT;
BEGIN
    -- Generate unique transaction IDs
    google_tx_id := 'test-google-' || gen_random_uuid()::text;
    manual_tx_id := 'test-manual-' || gen_random_uuid()::text;

    -- Insert Google OAuth user transaction
    INSERT INTO public.wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
    ) VALUES (
        'mschangfx@gmail.com',
        google_tx_id,
        'deposit',
        300.00000000,
        950.00000000,
        1250.00000000,
        'USDT TRC20 Deposit: $300.00',
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (transaction_id) DO NOTHING;

    -- Insert Manual login user transaction
    INSERT INTO public.wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
    ) VALUES (
        'manual-user@example.com',
        manual_tx_id,
        'deposit',
        150.00000000,
        800.00000000,
        950.00000000,
        'USDT TRC20 Deposit: $150.00',
        NOW() - INTERVAL '2 hours'
    ) ON CONFLICT (transaction_id) DO NOTHING;

    RAISE NOTICE 'Test transactions created with IDs: % and %', google_tx_id, manual_tx_id;
END $$;

SELECT 'Fixed wallet and deposits setup completed successfully!' as result;

-- Show test data
SELECT
    'User Wallets:' as section,
    user_email,
    total_balance::text,
    tic_balance::text,
    gic_balance::text,
    staking_balance::text
FROM public.user_wallets
WHERE user_email IN ('mschangfx@gmail.com', 'manual-user@example.com')
ORDER BY user_email;

SELECT
    'Recent Transactions:' as section,
    user_email,
    transaction_type,
    amount::text,
    description,
    created_at::text
FROM public.wallet_transactions
WHERE user_email IN ('mschangfx@gmail.com', 'manual-user@example.com')
ORDER BY created_at DESC;
