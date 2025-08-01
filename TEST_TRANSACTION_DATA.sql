-- =====================================================
-- TEST TRANSACTION DATA FOR TRANSACTION HISTORY
-- =====================================================
-- This creates sample transactions to test the transaction history page
-- Run this AFTER running TRANSACTION_HISTORY_SETUP.sql

-- Replace 'your-email@example.com' with your actual email address
-- You can find your email by checking your Google OAuth login or manual login

-- 1. Insert sample deposits (replace email with your actual email)
INSERT INTO public.deposits (
    user_email,
    amount,
    currency,
    method_id,
    method_name,
    network,
    deposit_address,
    wallet_address,
    final_amount,
    status,
    admin_notes,
    created_at
) VALUES 
-- Completed deposit
('your-email@example.com', 100.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 100.00, 'completed', 'Test completed deposit', NOW() - INTERVAL '2 days'),

-- Pending deposit
('your-email@example.com', 50.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 50.00, 'pending', NULL, NOW() - INTERVAL '1 day'),

-- Rejected deposit
('your-email@example.com', 25.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 25.00, 'rejected', 'Insufficient payment received', NOW() - INTERVAL '3 days'),

-- Another completed deposit
('your-email@example.com', 200.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20', 
 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 
 200.00, 'completed', 'Large deposit approved', NOW() - INTERVAL '5 days');

-- 2. Insert sample withdrawal requests (replace email with your actual email)
INSERT INTO public.withdrawal_requests (
    user_email,
    transaction_id,
    method_id,
    destination_address,
    amount,
    currency,
    network,
    final_amount,
    status,
    admin_notes,
    created_at
) VALUES 
-- Completed withdrawal
(gen_random_uuid(), 'your-email@example.com', 'usdt-trc20', 'TXYZabcd1234567890abcdef1234567890', 
 75.00, 'USD', 'TRC20', 75.00, 'completed', 'Withdrawal processed successfully', NOW() - INTERVAL '1 day'),

-- Pending withdrawal
(gen_random_uuid(), 'your-email@example.com', 'usdt-trc20', 'TXYZabcd1234567890abcdef1234567890', 
 30.00, 'USD', 'TRC20', 30.00, 'pending', NULL, NOW() - INTERVAL '6 hours'),

-- Failed withdrawal
(gen_random_uuid(), 'your-email@example.com', 'usdt-trc20', 'TXYZabcd1234567890abcdef1234567890', 
 150.00, 'USD', 'TRC20', 150.00, 'failed', 'Insufficient balance', NOW() - INTERVAL '2 days');

-- 3. Create a user wallet for the test user (replace email with your actual email)
INSERT INTO public.user_wallets (
    user_email,
    total_balance,
    tic_balance,
    gic_balance,
    staking_balance,
    created_at
) VALUES (
    'your-email@example.com',
    225.00, -- 100 + 200 - 75 (completed deposits minus completed withdrawal)
    0,
    0,
    0,
    NOW() - INTERVAL '5 days'
) ON CONFLICT (user_email) DO UPDATE SET
    total_balance = 225.00,
    last_updated = NOW();

-- 4. Insert corresponding wallet transactions (replace email with your actual email)
INSERT INTO public.wallet_transactions (
    user_email,
    transaction_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
) VALUES 
-- First deposit transaction
('your-email@example.com', 'dep_001', 'deposit', 100.00, 0, 100.00, 
 'Deposit completed: $100.00 via USDT (TRC20)', NOW() - INTERVAL '2 days'),

-- Second deposit transaction  
('your-email@example.com', 'dep_002', 'deposit', 200.00, 100.00, 300.00, 
 'Deposit completed: $200.00 via USDT (TRC20)', NOW() - INTERVAL '5 days'),

-- Withdrawal transaction
('your-email@example.com', 'with_001', 'withdrawal', -75.00, 300.00, 225.00, 
 'Withdrawal completed: $75.00 to external wallet', NOW() - INTERVAL '1 day');

-- 5. Show results
SELECT 'Test transaction data inserted successfully!' as result;

-- 6. Verify the data was inserted
SELECT 'DEPOSITS:' as table_name, COUNT(*) as count FROM public.deposits WHERE user_email = 'your-email@example.com'
UNION ALL
SELECT 'WITHDRAWALS:', COUNT(*) FROM public.withdrawal_requests WHERE user_email = 'your-email@example.com'
UNION ALL
SELECT 'WALLET TRANSACTIONS:', COUNT(*) FROM public.wallet_transactions WHERE user_email = 'your-email@example.com'
UNION ALL
SELECT 'USER WALLETS:', COUNT(*) FROM public.user_wallets WHERE user_email = 'your-email@example.com';

-- 7. Instructions for customization
SELECT '
IMPORTANT: Replace "your-email@example.com" with your actual email address!

To find your email:
1. Check your Google OAuth login email, OR
2. Check your manual login email in Supabase Auth users table

Then run this script again with your actual email address.
' as instructions;
