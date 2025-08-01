-- =====================================================
-- QUICK WALLET BALANCE UPDATE
-- =====================================================
-- Replace YOUR_EMAIL_HERE with your actual email address
-- This will quickly update your wallet balance based on completed deposits

-- 1. Check your current transactions
SELECT 
    'YOUR DEPOSITS' as info,
    user_email,
    amount,
    final_amount,
    status,
    created_at
FROM public.deposits 
WHERE user_email = 'YOUR_EMAIL_HERE'
ORDER BY created_at DESC;

SELECT 
    'YOUR WITHDRAWALS' as info,
    user_email,
    amount,
    final_amount,
    status,
    created_at
FROM public.withdrawal_requests 
WHERE user_email = 'YOUR_EMAIL_HERE'
ORDER BY created_at DESC;

-- 2. Calculate your balance
WITH your_balance AS (
    SELECT 
        'YOUR_EMAIL_HERE' as user_email,
        COALESCE((
            SELECT SUM(COALESCE(final_amount, amount)) 
            FROM public.deposits 
            WHERE user_email = 'YOUR_EMAIL_HERE' AND status = 'completed'
        ), 0) - COALESCE((
            SELECT SUM(COALESCE(final_amount, amount)) 
            FROM public.withdrawal_requests 
            WHERE user_email = 'YOUR_EMAIL_HERE' AND status = 'completed'
        ), 0) as calculated_balance
)
SELECT 
    'CALCULATED BALANCE' as info,
    user_email,
    calculated_balance
FROM your_balance;

-- 3. Update your wallet balance
INSERT INTO public.user_wallets (
    user_email, 
    total_balance, 
    tic_balance, 
    gic_balance, 
    staking_balance,
    last_updated,
    created_at
) 
SELECT 
    'YOUR_EMAIL_HERE',
    COALESCE((
        SELECT SUM(COALESCE(final_amount, amount)) 
        FROM public.deposits 
        WHERE user_email = 'YOUR_EMAIL_HERE' AND status = 'completed'
    ), 0) - COALESCE((
        SELECT SUM(COALESCE(final_amount, amount)) 
        FROM public.withdrawal_requests 
        WHERE user_email = 'YOUR_EMAIL_HERE' AND status = 'completed'
    ), 0),
    0, -- TIC balance
    0, -- GIC balance  
    0, -- Staking balance
    NOW(),
    NOW()
ON CONFLICT (user_email) 
DO UPDATE SET
    total_balance = COALESCE((
        SELECT SUM(COALESCE(final_amount, amount)) 
        FROM public.deposits 
        WHERE user_email = 'YOUR_EMAIL_HERE' AND status = 'completed'
    ), 0) - COALESCE((
        SELECT SUM(COALESCE(final_amount, amount)) 
        FROM public.withdrawal_requests 
        WHERE user_email = 'YOUR_EMAIL_HERE' AND status = 'completed'
    ), 0),
    last_updated = NOW();

-- 4. Verify your updated balance
SELECT 
    'YOUR UPDATED WALLET' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
FROM public.user_wallets
WHERE user_email = 'YOUR_EMAIL_HERE';

SELECT 'Your wallet balance has been updated!' as result;
