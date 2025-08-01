-- =====================================================
-- COMPLETE WALLET AND DEPOSITS SETUP
-- =====================================================
-- This creates all necessary wallet functions and updates deposits table
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

-- 2. Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id TEXT, -- Reference to deposit/withdrawal ID
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund', 'bonus')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    balance_before DECIMAL(18, 8) NOT NULL,
    balance_after DECIMAL(18, 8) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for wallet tables
CREATE INDEX IF NOT EXISTS idx_user_wallets_email ON public.user_wallets(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_email ON public.wallet_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);

-- 4. Enable RLS on wallet tables
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for wallet tables
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
CREATE POLICY "Users can view own wallet" ON public.user_wallets
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- 6. Function to get or create user wallet
CREATE OR REPLACE FUNCTION get_or_create_user_wallet(user_email_param VARCHAR(255))
RETURNS public.user_wallets AS $$
DECLARE
    wallet_record public.user_wallets;
BEGIN
    -- Try to get existing wallet
    SELECT * INTO wallet_record FROM public.user_wallets WHERE user_email = user_email_param;

    -- If wallet doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO public.user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
        VALUES (user_email_param, 0, 0, 0, 0)
        RETURNING * INTO wallet_record;
    END IF;

    RETURN wallet_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to credit user wallet
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
        INSERT INTO public.user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
        VALUES (user_email_param, 0, 0, 0, 0);
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

-- 8. Function to debit user wallet
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

-- 9. Now add missing columns to deposits table
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

-- 10. Create the automatic wallet crediting trigger
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

-- 11. Update existing deposits to have final_amount
UPDATE public.deposits 
SET final_amount = amount - COALESCE(processing_fee, 0) - COALESCE(network_fee, 0)
WHERE final_amount IS NULL;

SELECT 'Complete wallet and deposits setup completed successfully!' as result;
