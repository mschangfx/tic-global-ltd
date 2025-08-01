-- AUTOMATIC WALLET SYNC - No manual email input required
-- This will automatically detect all users and sync their wallet balances

-- 1. Create function to sync wallet balance for any user automatically
CREATE OR REPLACE FUNCTION sync_user_wallet_balance_auto(user_email_param TEXT)
RETURNS DECIMAL(18,8)
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
    
    -- Create or update wallet (ALL BALANCE GOES TO MAIN WALLET)
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
        0, -- All deposits go to main wallet
        0, -- No TIC distribution
        0, -- No staking distribution
        NOW(),
        NOW()
    )
    ON CONFLICT (user_email) 
    DO UPDATE SET
        total_balance = calculated_balance,
        tic_balance = 0,
        gic_balance = 0,
        staking_balance = 0,
        last_updated = NOW();
        
    RETURN calculated_balance;
END;
$$;

-- 2. Automatically sync ALL user wallets (no manual input needed)
DO $$
DECLARE
    user_record RECORD;
    synced_balance DECIMAL(18,8);
BEGIN
    -- Find all users who have deposits or withdrawals
    FOR user_record IN 
        SELECT DISTINCT user_email 
        FROM (
            SELECT user_email FROM public.deposits WHERE status = 'completed'
            UNION
            SELECT user_email FROM public.withdrawal_requests WHERE status = 'completed'
            UNION
            SELECT user_email FROM public.user_wallets
        ) AS all_users
        ORDER BY user_email
    LOOP
        -- Sync this user's wallet automatically
        SELECT sync_user_wallet_balance_auto(user_record.user_email) INTO synced_balance;
        
        -- Log the sync
        RAISE NOTICE 'Auto-synced wallet for %: $%', user_record.user_email, synced_balance;
    END LOOP;
END $$;

-- 3. Show all synced wallets (automatic results)
SELECT 
    'AUTO-SYNCED WALLETS' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
FROM public.user_wallets
ORDER BY total_balance DESC, user_email;

-- 4. Create function for frontend to get current authenticated user's balance
CREATE OR REPLACE FUNCTION get_current_user_wallet()
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
BEGIN
    -- This will work with RLS and automatically detect the authenticated user
    RETURN QUERY
    SELECT 
        w.user_email,
        w.total_balance,
        w.tic_balance,
        w.gic_balance,
        w.staking_balance,
        w.last_updated
    FROM public.user_wallets w
    WHERE w.user_email = auth.email(); -- Automatic user detection
END;
$$;

SELECT 'Automatic wallet sync completed! All wallets updated without manual input.' as result;
