-- FIX: All deposits should go to main wallet balance only
-- This will update the credit_user_wallet function to put all deposits into total_balance
-- instead of distributing across TIC, GIC, and staking

-- 1. Check current wallet setup
SELECT 
    'CURRENT WALLET BALANCES' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
FROM public.user_wallets
ORDER BY user_email;

-- 2. Update the credit_user_wallet function to put all deposits in main wallet
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
    
    -- Calculate new balance (ALL DEPOSIT GOES TO MAIN WALLET)
    new_balance := current_balance + amount_param;
    
    -- Update ONLY the total_balance (no distribution to TIC, GIC, staking)
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

-- 3. Update existing wallets to consolidate TIC, GIC, staking into main balance
UPDATE public.user_wallets
SET
    total_balance = total_balance + tic_balance + gic_balance + staking_balance,
    tic_balance = 0,
    gic_balance = 0,
    staking_balance = 0,
    last_updated = NOW()
WHERE tic_balance > 0 OR gic_balance > 0 OR staking_balance > 0;

-- 3.1. Force sync wallet balance for authenticated user (automatic detection)
DO $$
DECLARE
    user_record RECORD;
    total_deposits DECIMAL(18,8) := 0;
    total_withdrawals DECIMAL(18,8) := 0;
    calculated_balance DECIMAL(18,8) := 0;
BEGIN
    -- Process all users with deposits or withdrawals
    FOR user_record IN
        SELECT DISTINCT user_email
        FROM (
            SELECT user_email FROM public.deposits WHERE status = 'completed'
            UNION
            SELECT user_email FROM public.withdrawal_requests WHERE status = 'completed'
        ) AS all_users
    LOOP
        -- Calculate total completed deposits for this user
        SELECT COALESCE(SUM(COALESCE(final_amount, amount)), 0)
        INTO total_deposits
        FROM public.deposits
        WHERE user_email = user_record.user_email AND status = 'completed';

        -- Calculate total completed withdrawals for this user
        SELECT COALESCE(SUM(COALESCE(final_amount, amount)), 0)
        INTO total_withdrawals
        FROM public.withdrawal_requests
        WHERE user_email = user_record.user_email AND status = 'completed';

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
            user_record.user_email,
            calculated_balance,
            0, -- All in main wallet now
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

        -- Log the update
        RAISE NOTICE 'Auto-synced wallet for %: Balance=$%',
            user_record.user_email, calculated_balance;
    END LOOP;
END $$;

-- 4. Show updated wallet balances
SELECT 
    'UPDATED WALLET BALANCES' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
FROM public.user_wallets
ORDER BY user_email;

-- 5. Test the updated function (optional - uncomment to test)
/*
-- Test with a small deposit
SELECT credit_user_wallet(
    'test@example.com',
    10.00,
    'test-transaction-123',
    'Test deposit - should go to main wallet only'
) as test_result;

-- Check the test result
SELECT 
    'TEST RESULT' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance
FROM public.user_wallets
WHERE user_email = 'test@example.com';
*/

SELECT 'Deposit fix completed! All future deposits will go to main wallet balance only.' as result;
