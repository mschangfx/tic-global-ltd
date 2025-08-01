-- =====================================================
-- UPDATE WALLET BALANCE BASED ON COMPLETED TRANSACTIONS
-- =====================================================
-- This script calculates and updates wallet balances based on completed deposits
-- Run this in your Supabase SQL Editor after adding test transaction data

-- 1. First, let's see what transactions exist
SELECT 
    'DEPOSITS' as table_name,
    user_email,
    status,
    COUNT(*) as count,
    SUM(COALESCE(final_amount, amount)) as total_amount
FROM public.deposits 
GROUP BY user_email, status
ORDER BY user_email, status;

-- 2. Show current wallet balances
SELECT 
    'CURRENT WALLETS' as info,
    user_email,
    total_balance,
    last_updated
FROM public.user_wallets
ORDER BY user_email;

-- 3. Calculate what wallet balances should be based on completed deposits
WITH completed_deposits AS (
    SELECT 
        user_email,
        SUM(COALESCE(final_amount, amount)) as total_deposits
    FROM public.deposits 
    WHERE status = 'completed'
    GROUP BY user_email
),
completed_withdrawals AS (
    SELECT 
        user_email,
        SUM(COALESCE(final_amount, amount)) as total_withdrawals
    FROM public.withdrawal_requests 
    WHERE status = 'completed'
    GROUP BY user_email
)
SELECT 
    'CALCULATED BALANCES' as info,
    COALESCE(d.user_email, w.user_email) as user_email,
    COALESCE(d.total_deposits, 0) as total_deposits,
    COALESCE(w.total_withdrawals, 0) as total_withdrawals,
    (COALESCE(d.total_deposits, 0) - COALESCE(w.total_withdrawals, 0)) as calculated_balance
FROM completed_deposits d
FULL OUTER JOIN completed_withdrawals w ON d.user_email = w.user_email
ORDER BY user_email;

-- 4. Update wallet balances based on completed transactions
-- This will create wallets if they don't exist and update balances
DO $$
DECLARE
    user_record RECORD;
    total_deposits DECIMAL(18,8);
    total_withdrawals DECIMAL(18,8);
    calculated_balance DECIMAL(18,8);
BEGIN
    -- Loop through all users who have completed transactions
    FOR user_record IN (
        SELECT DISTINCT user_email 
        FROM (
            SELECT user_email FROM public.deposits WHERE status = 'completed'
            UNION
            SELECT user_email FROM public.withdrawal_requests WHERE status = 'completed'
        ) all_users
    ) LOOP
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
            
        -- Log the update
        RAISE NOTICE 'Updated wallet for %: Deposits=%, Withdrawals=%, Balance=%', 
            user_record.user_email, total_deposits, total_withdrawals, calculated_balance;
    END LOOP;
END $$;

-- 5. Show updated wallet balances
SELECT 
    'UPDATED WALLETS' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
FROM public.user_wallets
ORDER BY user_email;

-- 6. Create wallet transactions for the balance updates (for audit trail)
INSERT INTO public.wallet_transactions (
    user_email,
    transaction_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
)
SELECT 
    w.user_email,
    'balance_sync_' || EXTRACT(EPOCH FROM NOW())::text,
    'deposit',
    w.total_balance,
    0,
    w.total_balance,
    'Balance synchronized with completed transactions',
    NOW()
FROM public.user_wallets w
WHERE w.total_balance > 0
AND NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions wt 
    WHERE wt.user_email = w.user_email 
    AND wt.description = 'Balance synchronized with completed transactions'
);

SELECT 'Wallet balances updated successfully!' as result;

-- 7. Verify the final state
SELECT 
    'FINAL VERIFICATION' as info,
    w.user_email,
    w.total_balance as wallet_balance,
    COALESCE(d.completed_deposits, 0) as completed_deposits,
    COALESCE(wr.completed_withdrawals, 0) as completed_withdrawals,
    (COALESCE(d.completed_deposits, 0) - COALESCE(wr.completed_withdrawals, 0)) as expected_balance,
    CASE 
        WHEN w.total_balance = (COALESCE(d.completed_deposits, 0) - COALESCE(wr.completed_withdrawals, 0)) 
        THEN '✅ CORRECT' 
        ELSE '❌ MISMATCH' 
    END as status
FROM public.user_wallets w
LEFT JOIN (
    SELECT user_email, SUM(COALESCE(final_amount, amount)) as completed_deposits
    FROM public.deposits 
    WHERE status = 'completed'
    GROUP BY user_email
) d ON w.user_email = d.user_email
LEFT JOIN (
    SELECT user_email, SUM(COALESCE(final_amount, amount)) as completed_withdrawals
    FROM public.withdrawal_requests 
    WHERE status = 'completed'
    GROUP BY user_email
) wr ON w.user_email = wr.user_email
ORDER BY w.user_email;
