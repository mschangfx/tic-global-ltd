-- Create the missing increment_tic_balance_daily_distribution function
-- This function updates user TIC balances when daily tokens are distributed

-- 1. Create function to increment TIC balance for daily distribution
CREATE OR REPLACE FUNCTION increment_tic_balance_daily_distribution(
    user_email_param TEXT,
    amount_param DECIMAL(18, 8),
    transaction_id_param TEXT,
    description_param TEXT,
    plan_type_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
    wallet_exists BOOLEAN;
BEGIN
    -- Check if wallet exists
    SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        -- Create wallet if it doesn't exist
        INSERT INTO user_wallets (
            user_email, 
            total_balance, 
            tic_balance, 
            gic_balance, 
            staking_balance, 
            partner_wallet_balance,
            last_updated
        ) VALUES (
            user_email_param, 
            0, 
            0, 
            0, 
            0, 
            0,
            NOW()
        );
        current_balance := 0;
    ELSE
        -- Get current TIC balance
        SELECT COALESCE(tic_balance, 0) INTO current_balance
        FROM user_wallets
        WHERE user_email = user_email_param;
    END IF;

    -- Calculate new balance
    new_balance := current_balance + amount_param;

    -- Update TIC balance
    UPDATE user_wallets
    SET
        tic_balance = new_balance,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Create transaction history record
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        currency,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param,
        'daily_distribution',
        amount_param,
        'TIC',
        current_balance,
        new_balance,
        description_param,
        jsonb_build_object(
            'token_type', 'TIC', 
            'distribution_type', 'daily_plan_distribution',
            'plan_type', COALESCE(plan_type_param, 'unknown'),
            'daily_amount', amount_param
        ),
        NOW()
    );

    RAISE NOTICE 'Updated TIC balance for %: % -> % (+% TIC)', 
        user_email_param, current_balance, new_balance, amount_param;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to increment GIC balance for daily distribution
CREATE OR REPLACE FUNCTION increment_gic_balance_daily_distribution(
    user_email_param TEXT,
    amount_param DECIMAL(18, 8),
    transaction_id_param TEXT,
    description_param TEXT,
    plan_type_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
    wallet_exists BOOLEAN;
BEGIN
    -- Check if wallet exists
    SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        -- Create wallet if it doesn't exist
        INSERT INTO user_wallets (
            user_email, 
            total_balance, 
            tic_balance, 
            gic_balance, 
            staking_balance, 
            partner_wallet_balance,
            last_updated
        ) VALUES (
            user_email_param, 
            0, 
            0, 
            0, 
            0, 
            0,
            NOW()
        );
        current_balance := 0;
    ELSE
        -- Get current GIC balance
        SELECT COALESCE(gic_balance, 0) INTO current_balance
        FROM user_wallets
        WHERE user_email = user_email_param;
    END IF;

    -- Calculate new balance
    new_balance := current_balance + amount_param;

    -- Update GIC balance
    UPDATE user_wallets
    SET
        gic_balance = new_balance,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Create transaction history record
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        currency,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param,
        'daily_distribution',
        amount_param,
        'GIC',
        current_balance,
        new_balance,
        description_param,
        jsonb_build_object(
            'token_type', 'GIC', 
            'distribution_type', 'daily_plan_distribution',
            'plan_type', COALESCE(plan_type_param, 'unknown'),
            'daily_amount', amount_param
        ),
        NOW()
    );

    RAISE NOTICE 'Updated GIC balance for %: % -> % (+% GIC)', 
        user_email_param, current_balance, new_balance, amount_param;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to increment Partner Wallet balance
CREATE OR REPLACE FUNCTION increment_partner_wallet_balance(
    user_email_param TEXT,
    amount_param DECIMAL(18, 8),
    transaction_id_param TEXT,
    description_param TEXT,
    source_type_param TEXT DEFAULT 'referral_commission'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
    wallet_exists BOOLEAN;
BEGIN
    -- Check if wallet exists
    SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        -- Create wallet if it doesn't exist
        INSERT INTO user_wallets (
            user_email, 
            total_balance, 
            tic_balance, 
            gic_balance, 
            staking_balance, 
            partner_wallet_balance,
            last_updated
        ) VALUES (
            user_email_param, 
            0, 
            0, 
            0, 
            0, 
            0,
            NOW()
        );
        current_balance := 0;
    ELSE
        -- Get current Partner Wallet balance
        SELECT COALESCE(partner_wallet_balance, 0) INTO current_balance
        FROM user_wallets
        WHERE user_email = user_email_param;
    END IF;

    -- Calculate new balance
    new_balance := current_balance + amount_param;

    -- Update Partner Wallet balance
    UPDATE user_wallets
    SET
        partner_wallet_balance = new_balance,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Create transaction history record
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        currency,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param,
        'partner_commission',
        amount_param,
        'USD',
        current_balance,
        new_balance,
        description_param,
        jsonb_build_object(
            'wallet_type', 'partner_wallet', 
            'commission_type', source_type_param,
            'amount', amount_param
        ),
        NOW()
    );

    RAISE NOTICE 'Updated Partner Wallet for %: $% -> $% (+$% USD)', 
        user_email_param, current_balance, new_balance, amount_param;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_tic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_tic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_gic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_gic_balance_daily_distribution(TEXT, DECIMAL(18, 8), TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_partner_wallet_balance(TEXT, DECIMAL(18, 8), TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_partner_wallet_balance(TEXT, DECIMAL(18, 8), TEXT, TEXT, TEXT) TO anon;
