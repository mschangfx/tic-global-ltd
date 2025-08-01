-- STEP 6: Create the payment processing function
-- Run this after completing all steps in database-setup-step-by-step.sql

CREATE OR REPLACE FUNCTION process_plan_payment(
    user_email_param VARCHAR(255),
    plan_id_param VARCHAR(50),
    payment_amount_param DECIMAL(18, 8),
    transaction_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    plan_duration INTEGER;
BEGIN
    -- Get current wallet balance
    SELECT total_balance INTO current_balance
    FROM user_wallets
    WHERE user_email = user_email_param;
    
    -- Check if user has sufficient balance
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User wallet not found for email: %', user_email_param;
    END IF;
    
    IF current_balance < payment_amount_param THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', payment_amount_param, current_balance;
    END IF;
    
    -- Get plan duration
    SELECT duration_days INTO plan_duration
    FROM payment_plans
    WHERE plan_id = plan_id_param AND is_active = true;
    
    IF plan_duration IS NULL THEN
        RAISE EXCEPTION 'Plan not found or inactive: %', plan_id_param;
    END IF;
    
    -- Debit the wallet
    UPDATE user_wallets
    SET 
        total_balance = total_balance - payment_amount_param,
        last_updated = NOW()
    WHERE user_email = user_email_param;
    
    -- Create or update user plan subscription
    INSERT INTO user_plan_subscriptions (
        user_email,
        plan_id,
        transaction_id,
        status,
        started_at,
        expires_at,
        payment_amount
    ) VALUES (
        user_email_param,
        plan_id_param,
        transaction_id_param,
        'active',
        NOW(),
        CASE 
            WHEN plan_duration > 0 THEN NOW() + INTERVAL '1 day' * plan_duration
            ELSE NULL
        END,
        payment_amount_param
    )
    ON CONFLICT (user_email, plan_id) 
    DO UPDATE SET
        transaction_id = transaction_id_param,
        status = 'active',
        started_at = NOW(),
        expires_at = CASE 
            WHEN plan_duration > 0 THEN NOW() + INTERVAL '1 day' * plan_duration
            ELSE NULL
        END,
        payment_amount = payment_amount_param,
        updated_at = NOW();
        
    -- Update transaction status to completed (if transactions table exists)
    -- Handle case where updated_at column might not exist
    BEGIN
        UPDATE transactions
        SET
            status = 'completed',
            updated_at = NOW()
        WHERE id = transaction_id_param;
    EXCEPTION
        WHEN undefined_column THEN
            -- If updated_at column doesn't exist, just update status
            UPDATE transactions
            SET status = 'completed'
            WHERE id = transaction_id_param;
    END;
    
END;
$$;

-- Add unique constraint for user_plan_subscriptions to prevent duplicates
-- This might fail if the constraint already exists, which is fine
DO $$
BEGIN
    ALTER TABLE user_plan_subscriptions 
    ADD CONSTRAINT unique_user_plan 
    UNIQUE (user_email, plan_id);
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, ignore
        NULL;
END;
$$;

-- Test the function exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'process_plan_payment';
