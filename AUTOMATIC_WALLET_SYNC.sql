-- =====================================================
-- AUTOMATIC WALLET BALANCE SYNC FOR ALL USERS
-- =====================================================
-- This automatically syncs wallet balances for ALL users
-- No manual email input required - works for any user
-- Run this in your Supabase SQL Editor

-- 1. Create function to automatically sync wallet balance for any user
CREATE OR REPLACE FUNCTION sync_user_wallet_balance(user_email_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_deposits DECIMAL(18,8) := 0;
    total_withdrawals DECIMAL(18,8) := 0;
    calculated_balance DECIMAL(18,8) := 0;
BEGIN
    -- Calculate total completed deposits for this user
    SELECT COALESCE(SUM(COALESCE(final_amount, amount)), 0) 
    INTO total_deposits
    FROM public.deposits 
    WHERE user_email = user_email_param AND status = 'completed';
    
    -- Calculate total completed withdrawals for this user
    SELECT COALESCE(SUM(COALESCE(final_amount, amount)), 0) 
    INTO total_withdrawals
    FROM public.withdrawal_requests 
    WHERE user_email = user_email_param AND status = 'completed';
    
    -- Calculate net balance
    calculated_balance := total_deposits - total_withdrawals;
    
    -- Create or update wallet
    INSERT INTO public.user_wallets (
        user_email, 
        total_balance, 
        tic_balance, 
        gic_balance, 
        staking_balance,
        last_updated,
        created_at
    ) VALUES (
        user_email_param,
        calculated_balance,
        0, -- TIC balance
        0, -- GIC balance  
        0, -- Staking balance
        NOW(),
        NOW()
    )
    ON CONFLICT (user_email) 
    DO UPDATE SET
        total_balance = calculated_balance,
        last_updated = NOW();
        
    -- Log the sync
    RAISE NOTICE 'Synced wallet for %: Balance=%', user_email_param, calculated_balance;
    
    RETURN TRUE;
END;
$$;

-- 2. Create function to sync ALL user wallets automatically
CREATE OR REPLACE FUNCTION sync_all_wallet_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    sync_count INTEGER := 0;
BEGIN
    -- Loop through all users who have any transactions
    FOR user_record IN (
        SELECT DISTINCT user_email 
        FROM (
            SELECT user_email FROM public.deposits
            UNION
            SELECT user_email FROM public.withdrawal_requests
        ) all_users
        WHERE user_email IS NOT NULL
    ) LOOP
        -- Sync this user's wallet
        PERFORM sync_user_wallet_balance(user_record.user_email);
        sync_count := sync_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Synced % user wallets', sync_count;
    RETURN sync_count;
END;
$$;

-- 3. Create trigger to automatically update wallet when deposits are completed
CREATE OR REPLACE FUNCTION auto_update_wallet_on_deposit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'completed' and it wasn't completed before
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Sync the user's wallet balance
        PERFORM sync_user_wallet_balance(NEW.user_email);
        
        RAISE NOTICE 'Auto-synced wallet for % after deposit completion', NEW.user_email;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger to automatically update wallet when withdrawals are completed
CREATE OR REPLACE FUNCTION auto_update_wallet_on_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'completed' and it wasn't completed before
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Sync the user's wallet balance
        PERFORM sync_user_wallet_balance(NEW.user_email);
        
        RAISE NOTICE 'Auto-synced wallet for % after withdrawal completion', NEW.user_email;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Drop existing triggers if they exist and create new ones
DROP TRIGGER IF EXISTS auto_wallet_sync_on_deposit ON public.deposits;
CREATE TRIGGER auto_wallet_sync_on_deposit
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_wallet_on_deposit();

DROP TRIGGER IF EXISTS auto_wallet_sync_on_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER auto_wallet_sync_on_withdrawal
    AFTER UPDATE ON public.withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_wallet_on_withdrawal();

-- 6. Sync all existing user wallets automatically
SELECT sync_all_wallet_balances() as users_synced;

-- 7. Show all synced wallets
SELECT 
    'SYNCED WALLETS' as info,
    user_email,
    total_balance,
    last_updated
FROM public.user_wallets
ORDER BY total_balance DESC, user_email;

-- 8. Create function for frontend to get current user's balance (RLS-aware)
CREATE OR REPLACE FUNCTION get_current_user_balance()
RETURNS TABLE (
    user_email TEXT,
    total_balance DECIMAL(18,8),
    tic_balance DECIMAL(18,8),
    gic_balance DECIMAL(18,8),
    staking_balance DECIMAL(18,8),
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Get current authenticated user's email
    current_user_email := auth.jwt() ->> 'email';
    
    IF current_user_email IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Sync wallet balance first
    PERFORM sync_user_wallet_balance(current_user_email);
    
    -- Return the wallet data
    RETURN QUERY
    SELECT 
        w.user_email,
        w.total_balance,
        w.tic_balance,
        w.gic_balance,
        w.staking_balance,
        w.last_updated
    FROM public.user_wallets w
    WHERE w.user_email = current_user_email;
END;
$$;

SELECT 'Automatic wallet sync system created successfully!' as result;

-- 9. Test the automatic function (this will work for any authenticated user)
-- SELECT * FROM get_current_user_balance();
