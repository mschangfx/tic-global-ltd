-- =====================================================
-- DEPOSITS TABLE SETUP FOR TIC GLOBAL
-- =====================================================
-- This creates a dedicated table for deposit transactions
-- Run this in your Supabase SQL Editor

-- 1. Create the deposits table
CREATE TABLE public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User Information
    user_email TEXT NOT NULL,
    user_id UUID,
    
    -- Deposit Details
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    method_id TEXT NOT NULL, -- e.g., 'usdt-trc20', 'usdt-bep20'
    method_name TEXT NOT NULL, -- e.g., 'USDT', 'Bitcoin'
    network TEXT NOT NULL, -- e.g., 'TRC20', 'BEP20', 'ERC20'
    
    -- Wallet Information
    deposit_address TEXT NOT NULL, -- Our wallet address where user sends funds
    user_wallet_address TEXT, -- User's wallet address (if provided)
    
    -- Transaction Details
    transaction_hash TEXT, -- Blockchain transaction hash (when user sends)
    confirmation_count INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 1,
    
    -- Fees and Final Amount
    processing_fee DECIMAL(10,2) DEFAULT 0,
    network_fee DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(12,2), -- Amount after fees
    
    -- Status Management
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting for user payment
        'received',     -- Payment received, pending confirmation
        'confirmed',    -- Payment confirmed on blockchain
        'completed',    -- Funds credited to user wallet
        'rejected',     -- Rejected by admin
        'expired',      -- Payment window expired
        'failed'        -- Technical failure
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
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Constraints
    CONSTRAINT valid_final_amount CHECK (final_amount >= 0),
    CONSTRAINT valid_fees CHECK (processing_fee >= 0 AND network_fee >= 0)
);

-- 2. Create indexes for better performance
CREATE INDEX idx_deposits_user_email ON public.deposits(user_email);
CREATE INDEX idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX idx_deposits_status ON public.deposits(status);
CREATE INDEX idx_deposits_created_at ON public.deposits(created_at DESC);
CREATE INDEX idx_deposits_method ON public.deposits(method_id);
CREATE INDEX idx_deposits_network ON public.deposits(network);
CREATE INDEX idx_deposits_transaction_hash ON public.deposits(transaction_hash);
CREATE INDEX idx_deposits_expires_at ON public.deposits(expires_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Users can view their own deposits
CREATE POLICY "Users can view own deposits" ON public.deposits
    FOR SELECT USING (
        auth.jwt() ->> 'email' = user_email OR 
        auth.uid() = user_id
    );

-- Users can insert their own deposits
CREATE POLICY "Users can create own deposits" ON public.deposits
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'email' = user_email OR 
        auth.uid() = user_id
    );

-- Users can update their own pending deposits (limited fields)
CREATE POLICY "Users can update own pending deposits" ON public.deposits
    FOR UPDATE USING (
        (auth.jwt() ->> 'email' = user_email OR auth.uid() = user_id) AND
        status = 'pending'
    ) WITH CHECK (
        status IN ('pending', 'expired') AND
        admin_notes IS NULL AND
        approved_by IS NULL
    );

-- Admins can do everything (you'll need to set up admin role)
CREATE POLICY "Admins can manage all deposits" ON public.deposits
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- 5. Create helper functions

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

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deposits_updated_at
    BEFORE UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create function to automatically credit wallet when deposit is completed
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

-- Create trigger to automatically credit wallet on deposit completion
CREATE TRIGGER credit_wallet_on_deposit_completion_trigger
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION credit_wallet_on_deposit_completion();

-- 7. Test the setup
-- Uncomment the lines below to test after creating the table

/*
-- Test insert
INSERT INTO public.deposits (
    user_email,
    amount,
    method_id,
    method_name,
    network,
    deposit_address
) VALUES (
    'test@example.com',
    100.00,
    'usdt-trc20',
    'USDT',
    'TRC20',
    'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF'
);

-- Test select
SELECT * FROM public.deposits WHERE user_email = 'test@example.com';

-- Test function
SELECT * FROM get_pending_deposits(10);
*/
