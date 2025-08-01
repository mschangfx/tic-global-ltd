-- =====================================================
-- DEPOSITS TABLE UPDATE - ADD MISSING COMPONENTS
-- =====================================================
-- This adds missing components to the existing deposits table
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add final_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'final_amount') THEN
        ALTER TABLE public.deposits ADD COLUMN final_amount DECIMAL(12,2);
        -- Update existing records to set final_amount = amount - processing_fee - network_fee
        UPDATE public.deposits SET final_amount = amount - COALESCE(processing_fee, 0) - COALESCE(network_fee, 0);
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

    -- Add admin management columns if they don't exist
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

    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'deposits' AND column_name = 'expires_at') THEN
        ALTER TABLE public.deposits ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');
    END IF;
END $$;

-- 2. Create missing indexes (will skip if they already exist)
CREATE INDEX IF NOT EXISTS idx_deposits_user_email ON public.deposits(user_email);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON public.deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_method ON public.deposits(method_id);
CREATE INDEX IF NOT EXISTS idx_deposits_network ON public.deposits(network);
CREATE INDEX IF NOT EXISTS idx_deposits_transaction_hash ON public.deposits(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_expires_at ON public.deposits(expires_at);

-- 3. Enable Row Level Security (safe to run multiple times)
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- 4. Create or replace helper functions

-- Function to get pending deposits for admin
CREATE OR REPLACE FUNCTION get_pending_deposits(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    user_email TEXT,
    amount DECIMAL,
    currency TEXT,
    method_name TEXT,
    network TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        d.id,
        d.user_email,
        d.amount,
        d.currency,
        d.method_name,
        d.network,
        d.status,
        d.created_at,
        d.expires_at
    FROM public.deposits d
    WHERE d.status IN ('pending', 'received', 'confirmed')
    ORDER BY d.created_at DESC
    LIMIT limit_count;
$$;

-- Function to update deposit status (admin use)
CREATE OR REPLACE FUNCTION update_deposit_status(
    deposit_id_param UUID,
    new_status TEXT,
    admin_email_param TEXT,
    admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.deposits
    SET 
        status = new_status,
        admin_email = admin_email_param,
        admin_notes = admin_notes_param,
        updated_at = NOW(),
        approved_by = CASE WHEN new_status = 'completed' THEN admin_email_param ELSE approved_by END,
        approved_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE approved_at END,
        rejected_by = CASE WHEN new_status = 'rejected' THEN admin_email_param ELSE rejected_by END,
        rejected_at = CASE WHEN new_status = 'rejected' THEN NOW() ELSE rejected_at END
    WHERE id = deposit_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function to get user deposit history
CREATE OR REPLACE FUNCTION get_user_deposits(
    user_email_param TEXT,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    amount DECIMAL,
    currency TEXT,
    method_name TEXT,
    network TEXT,
    status TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        d.id,
        d.amount,
        d.currency,
        d.method_name,
        d.network,
        d.status,
        d.admin_notes,
        d.created_at,
        d.updated_at
    FROM public.deposits d
    WHERE d.user_email = user_email_param
    ORDER BY d.created_at DESC
    LIMIT limit_count;
$$;

-- 5. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_deposits_updated_at ON public.deposits;
CREATE TRIGGER update_deposits_updated_at 
    BEFORE UPDATE ON public.deposits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create function to automatically credit wallet when deposit is completed
CREATE OR REPLACE FUNCTION credit_wallet_on_deposit_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'completed' and it wasn't completed before
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Credit the user's wallet using the existing credit function
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

-- 7. Update existing deposits to have final_amount if null
UPDATE public.deposits 
SET final_amount = amount - COALESCE(processing_fee, 0) - COALESCE(network_fee, 0)
WHERE final_amount IS NULL;

-- 8. Test the automatic wallet crediting (optional)
-- Uncomment to test with an existing deposit
/*
-- Find a pending deposit and complete it to test wallet crediting
UPDATE public.deposits 
SET status = 'completed', 
    admin_email = 'test-admin@example.com',
    admin_notes = 'Test completion for wallet crediting'
WHERE status = 'pending' 
AND user_email = 'your-test-email@example.com'
LIMIT 1;
*/

SELECT 'Deposits table update completed successfully!' as result;
