-- RANK BONUS DISTRIBUTION SYSTEM
-- This SQL creates the infrastructure for distributing monthly rank bonuses
-- 50% as GIC tokens and 50% as TIC tokens to user wallets

-- 1. Create rank_bonus_distributions table to track monthly bonus payments
CREATE TABLE IF NOT EXISTS rank_bonus_distributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    total_referrals INTEGER NOT NULL,
    bonus_amount DECIMAL(10, 2) NOT NULL,
    tic_amount DECIMAL(18, 8) NOT NULL, -- 50% as TIC tokens
    gic_amount DECIMAL(18, 8) NOT NULL, -- 50% as GIC tokens
    distribution_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one distribution per user per month
    UNIQUE(user_email, distribution_month)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rank_bonus_distributions_user_email ON rank_bonus_distributions(user_email);
CREATE INDEX IF NOT EXISTS idx_rank_bonus_distributions_month ON rank_bonus_distributions(distribution_month);
CREATE INDEX IF NOT EXISTS idx_rank_bonus_distributions_status ON rank_bonus_distributions(status);

-- 3. Function to increment TIC balance with transaction history
CREATE OR REPLACE FUNCTION increment_tic_balance_with_history(
    user_email_param TEXT,
    amount_param DECIMAL(18, 8),
    transaction_id_param TEXT,
    description_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
BEGIN
    -- Get or create user wallet
    INSERT INTO user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
    VALUES (user_email_param, 0, 0, 0, 0)
    ON CONFLICT (user_email) DO NOTHING;

    -- Get current TIC balance
    SELECT tic_balance INTO current_balance
    FROM user_wallets
    WHERE user_email = user_email_param;

    -- Calculate new balance
    new_balance := COALESCE(current_balance, 0) + amount_param;

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
        'bonus',
        amount_param,
        'TIC',
        COALESCE(current_balance, 0),
        new_balance,
        description_param,
        jsonb_build_object('token_type', 'TIC', 'bonus_type', 'rank_bonus'),
        NOW()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to increment GIC balance with transaction history
CREATE OR REPLACE FUNCTION increment_gic_balance_with_history(
    user_email_param TEXT,
    amount_param DECIMAL(18, 8),
    transaction_id_param TEXT,
    description_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
BEGIN
    -- Get or create user wallet
    INSERT INTO user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
    VALUES (user_email_param, 0, 0, 0, 0)
    ON CONFLICT (user_email) DO NOTHING;

    -- Get current GIC balance
    SELECT gic_balance INTO current_balance
    FROM user_wallets
    WHERE user_email = user_email_param;

    -- Calculate new balance
    new_balance := COALESCE(current_balance, 0) + amount_param;

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
        'bonus',
        amount_param,
        'GIC',
        COALESCE(current_balance, 0),
        new_balance,
        description_param,
        jsonb_build_object('token_type', 'GIC', 'bonus_type', 'rank_bonus'),
        NOW()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to calculate user rank based on referrals
CREATE OR REPLACE FUNCTION get_user_rank_from_referrals(total_referrals INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF total_referrals = 0 THEN RETURN 'Common';
    ELSIF total_referrals >= 1 AND total_referrals <= 10 THEN RETURN 'Advance';
    ELSIF total_referrals >= 11 AND total_referrals < 12 THEN RETURN 'Bronze';
    ELSIF total_referrals >= 12 AND total_referrals < 13 THEN RETURN 'Silver';
    ELSIF total_referrals >= 13 AND total_referrals < 14 THEN RETURN 'Gold';
    ELSIF total_referrals >= 14 AND total_referrals < 15 THEN RETURN 'Platinum';
    ELSIF total_referrals >= 15 THEN RETURN 'Diamond';
    ELSE RETURN 'Common';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get rank bonus amount
CREATE OR REPLACE FUNCTION get_rank_bonus_amount(rank_name TEXT)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    CASE rank_name
        WHEN 'Bronze' THEN RETURN 690.00;
        WHEN 'Silver' THEN RETURN 2484.00;
        WHEN 'Gold' THEN RETURN 4830.00;
        WHEN 'Platinum' THEN RETURN 8832.00;
        WHEN 'Diamond' THEN RETURN 14904.00;
        ELSE RETURN 0.00;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to process rank bonus distribution for a user
CREATE OR REPLACE FUNCTION process_user_rank_bonus(
    user_email_param TEXT,
    distribution_month_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_referrals INTEGER;
    user_rank TEXT;
    bonus_amount DECIMAL(10, 2);
    tic_amount DECIMAL(18, 8);
    gic_amount DECIMAL(18, 8);
    existing_distribution UUID;
    tic_transaction_id TEXT;
    gic_transaction_id TEXT;
BEGIN
    -- Check if distribution already exists for this month
    SELECT id INTO existing_distribution
    FROM rank_bonus_distributions
    WHERE user_email = user_email_param AND distribution_month = distribution_month_param;
    
    IF existing_distribution IS NOT NULL THEN
        RAISE NOTICE 'Distribution already exists for user % in month %', user_email_param, distribution_month_param;
        RETURN FALSE;
    END IF;
    
    -- Get user's total referrals
    SELECT COUNT(*) INTO user_referrals
    FROM referral_relationships
    WHERE referrer_email = user_email_param AND is_active = true;
    
    -- Calculate rank and bonus
    user_rank := get_user_rank_from_referrals(user_referrals);
    bonus_amount := get_rank_bonus_amount(user_rank);
    
    -- Only process if user has a bonus-earning rank
    IF bonus_amount > 0 THEN
        -- Calculate 50/50 split
        tic_amount := bonus_amount / 2; -- 50% as TIC tokens (1 TIC = $1 for bonus distribution)
        gic_amount := bonus_amount / 2; -- 50% as GIC tokens (1 GIC = $1)
        
        -- Create distribution record
        INSERT INTO rank_bonus_distributions (
            user_email,
            rank,
            total_referrals,
            bonus_amount,
            tic_amount,
            gic_amount,
            distribution_month,
            status
        ) VALUES (
            user_email_param,
            user_rank,
            user_referrals,
            bonus_amount,
            tic_amount,
            gic_amount,
            distribution_month_param,
            'pending'
        );
        
        -- Generate unique transaction IDs
        tic_transaction_id := 'rank_bonus_tic_' || distribution_month_param || '_' || user_email_param;
        gic_transaction_id := 'rank_bonus_gic_' || distribution_month_param || '_' || user_email_param;

        -- Credit TIC tokens to user wallet with transaction history
        PERFORM increment_tic_balance_with_history(
            user_email_param,
            tic_amount,
            tic_transaction_id,
            'Rank Bonus - ' || user_rank || ' (' || distribution_month_param || ') - TIC Tokens'
        );

        -- Credit GIC tokens to user wallet with transaction history
        PERFORM increment_gic_balance_with_history(
            user_email_param,
            gic_amount,
            gic_transaction_id,
            'Rank Bonus - ' || user_rank || ' (' || distribution_month_param || ') - GIC Tokens'
        );
        
        -- Update distribution status
        UPDATE rank_bonus_distributions
        SET 
            status = 'completed',
            processed_at = NOW()
        WHERE user_email = user_email_param AND distribution_month = distribution_month_param;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create view for rank bonus history
CREATE OR REPLACE VIEW user_rank_bonus_history AS
SELECT 
    rbd.*,
    CASE 
        WHEN rbd.status = 'completed' THEN 'Distributed'
        WHEN rbd.status = 'pending' THEN 'Processing'
        ELSE 'Failed'
    END as status_display,
    TO_CHAR(rbd.created_at, 'Mon YYYY') as month_display
FROM rank_bonus_distributions rbd
ORDER BY rbd.created_at DESC;

-- 9. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON rank_bonus_distributions TO authenticated;
GRANT SELECT ON user_rank_bonus_history TO authenticated;
GRANT EXECUTE ON FUNCTION process_user_rank_bonus(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank_from_referrals(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rank_bonus_amount(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_tic_balance_with_history(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_gic_balance_with_history(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- 10. Add comments for documentation
COMMENT ON TABLE rank_bonus_distributions IS 'Tracks monthly rank bonus distributions (50% TIC, 50% GIC)';
COMMENT ON FUNCTION process_user_rank_bonus(TEXT, TEXT) IS 'Processes monthly rank bonus for a user, distributing 50% as TIC and 50% as GIC tokens';
COMMENT ON VIEW user_rank_bonus_history IS 'User-friendly view of rank bonus distribution history';
