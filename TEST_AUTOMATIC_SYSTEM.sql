-- =====================================================
-- TEST AUTOMATIC WALLET SYSTEM
-- =====================================================
-- This creates test data for multiple users to verify the system works automatically
-- No manual email input required - works for any user

-- 1. Create test users with different transaction scenarios
-- User 1: Has completed deposits only
INSERT INTO public.deposits (
    user_email, amount, currency, method_id, method_name, network,
    deposit_address, wallet_address, final_amount, status, admin_notes, created_at
) VALUES 
('testuser1@example.com', 100.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 100.00, 'completed', 'Auto test deposit', NOW() - INTERVAL '2 days'),

('testuser1@example.com', 50.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 50.00, 'pending', NULL, NOW() - INTERVAL '1 day');

-- User 2: Has both deposits and withdrawals
INSERT INTO public.deposits (
    user_email, amount, currency, method_id, method_name, network,
    deposit_address, wallet_address, final_amount, status, admin_notes, created_at
) VALUES 
('testuser2@example.com', 200.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 200.00, 'completed', 'Auto test deposit', NOW() - INTERVAL '3 days');

INSERT INTO public.withdrawal_requests (
    user_email, transaction_id, method_id, destination_address,
    amount, currency, network, final_amount, status, admin_notes, created_at
) VALUES 
('testuser2@example.com', gen_random_uuid(), 'usdt-trc20', 'TXYZabcd1234567890abcdef1234567890', 
 75.00, 'USD', 'TRC20', 75.00, 'completed', 'Auto test withdrawal', NOW() - INTERVAL '1 day');

-- User 3: Has rejected transactions (should have $0 balance)
INSERT INTO public.deposits (
    user_email, amount, currency, method_id, method_name, network,
    deposit_address, wallet_address, final_amount, status, admin_notes, created_at
) VALUES 
('testuser3@example.com', 300.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 300.00, 'rejected', 'Auto test rejected deposit', NOW() - INTERVAL '2 days');

-- 2. Test the automatic sync system
SELECT 'Testing automatic wallet sync...' as status;

-- This will automatically sync ALL users
SELECT sync_all_wallet_balances() as users_synced;

-- 3. Verify results
SELECT 
    'AUTOMATIC SYNC RESULTS' as info,
    user_email,
    total_balance,
    last_updated,
    CASE 
        WHEN user_email = 'testuser1@example.com' AND total_balance = 100.00 THEN '✅ CORRECT'
        WHEN user_email = 'testuser2@example.com' AND total_balance = 125.00 THEN '✅ CORRECT' 
        WHEN user_email = 'testuser3@example.com' AND total_balance = 0.00 THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as validation
FROM public.user_wallets
WHERE user_email IN ('testuser1@example.com', 'testuser2@example.com', 'testuser3@example.com')
ORDER BY user_email;

-- 4. Test automatic triggers by updating a transaction status
UPDATE public.deposits 
SET status = 'completed', admin_notes = 'Auto-approved by trigger test'
WHERE user_email = 'testuser1@example.com' AND status = 'pending';

-- 5. Verify trigger worked automatically
SELECT 
    'TRIGGER TEST RESULTS' as info,
    user_email,
    total_balance,
    last_updated,
    CASE 
        WHEN user_email = 'testuser1@example.com' AND total_balance = 150.00 THEN '✅ TRIGGER WORKED'
        ELSE '❌ TRIGGER FAILED'
    END as trigger_test
FROM public.user_wallets
WHERE user_email = 'testuser1@example.com';

-- 6. Show all wallets to verify system works for any user
SELECT 
    'ALL USER WALLETS' as info,
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    last_updated
FROM public.user_wallets
ORDER BY total_balance DESC, user_email;

-- 7. Clean up test data (optional - uncomment to remove test users)
/*
DELETE FROM public.deposits WHERE user_email IN ('testuser1@example.com', 'testuser2@example.com', 'testuser3@example.com');
DELETE FROM public.withdrawal_requests WHERE user_email IN ('testuser1@example.com', 'testuser2@example.com', 'testuser3@example.com');
DELETE FROM public.user_wallets WHERE user_email IN ('testuser1@example.com', 'testuser2@example.com', 'testuser3@example.com');
*/

SELECT 'Automatic wallet system test completed!' as result;
