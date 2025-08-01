-- Test script to verify the payment system database setup
-- Run this after completing all setup steps

-- 1. Check if tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('payment_plans', 'user_plan_subscriptions', 'user_wallets', 'transactions')
ORDER BY tablename;

-- 2. Check payment plans
SELECT 
    plan_id,
    name,
    price,
    currency,
    duration_days,
    is_active,
    sort_order
FROM payment_plans 
ORDER BY sort_order;

-- 3. Check if the payment function exists
SELECT 
    proname as function_name,
    pronargs as argument_count,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'process_plan_payment';

-- 4. Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('payment_plans', 'user_plan_subscriptions')
ORDER BY tablename, indexname;

-- 5. Sample test data setup (optional - only run if you want to test)
-- This creates a test user wallet with sufficient balance

/*
-- Uncomment and modify the email to test with your account
INSERT INTO user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance, pending_deposits, pending_withdrawals, last_updated)
VALUES ('your-test-email@example.com', 200.00, 0, 0, 0, 0, 0, NOW())
ON CONFLICT (user_email) 
DO UPDATE SET 
    total_balance = 200.00,
    last_updated = NOW();
*/

-- 6. Test query to check if everything is ready
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payment_plans') 
        AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_plan_subscriptions')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_plan_payment')
        AND EXISTS (SELECT 1 FROM payment_plans WHERE plan_id IN ('starter', 'vip'))
        THEN '✅ Payment system is ready!'
        ELSE '❌ Payment system setup incomplete'
    END as setup_status;

-- 7. Show current payment plans with details
SELECT 
    plan_id,
    name,
    description,
    price,
    currency,
    duration_days,
    features,
    metadata,
    is_active,
    created_at
FROM payment_plans 
WHERE is_active = true
ORDER BY sort_order;
