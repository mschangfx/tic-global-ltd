-- Database functions for ranking bonus distribution system
-- This handles TIC and GIC token distribution from referral ranking bonuses

-- 1. Function to credit TIC tokens from ranking bonuses
CREATE OR REPLACE FUNCTION credit_tic_ranking_bonus(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    rank_param VARCHAR(50),
    transaction_id_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
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

    -- Record transaction in wallet_transactions
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
        'TIC Tokens from ' || rank_param || ' Rank Bonus',
        jsonb_build_object(
            'bonus_type', 'ranking_bonus',
            'rank', rank_param,
            'token_type', 'TIC',
            'source', 'referral_ranking'
        ),
        NOW()
    );

    RETURN TRUE;
END;
$$;

-- 2. Function to credit GIC tokens from ranking bonuses
CREATE OR REPLACE FUNCTION credit_gic_ranking_bonus(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    rank_param VARCHAR(50),
    transaction_id_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
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

    -- Record transaction in wallet_transactions
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
        'GIC Tokens from ' || rank_param || ' Rank Bonus',
        jsonb_build_object(
            'bonus_type', 'ranking_bonus',
            'rank', rank_param,
            'token_type', 'GIC',
            'source', 'referral_ranking'
        ),
        NOW()
    );

    RETURN TRUE;
END;
$$;

-- 3. Combined function to distribute both TIC and GIC ranking bonuses
CREATE OR REPLACE FUNCTION distribute_ranking_bonus(
    user_email_param VARCHAR(255),
    total_bonus_param DECIMAL(18, 8),
    rank_param VARCHAR(50),
    transaction_id_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    tic_amount DECIMAL(18, 8);
    gic_amount DECIMAL(18, 8);
    tic_transaction_id TEXT;
    gic_transaction_id TEXT;
BEGIN
    -- Calculate 50/50 split
    tic_amount := total_bonus_param / 2;
    gic_amount := total_bonus_param / 2;
    
    -- Generate unique transaction IDs for each token
    tic_transaction_id := transaction_id_param || '_TIC';
    gic_transaction_id := transaction_id_param || '_GIC';

    -- Credit TIC tokens
    PERFORM credit_tic_ranking_bonus(
        user_email_param,
        tic_amount,
        rank_param,
        tic_transaction_id
    );

    -- Credit GIC tokens
    PERFORM credit_gic_ranking_bonus(
        user_email_param,
        gic_amount,
        rank_param,
        gic_transaction_id
    );

    RETURN TRUE;
END;
$$;

-- 4. Function to get user's ranking bonus history
CREATE OR REPLACE FUNCTION get_ranking_bonus_history(
    user_email_param VARCHAR(255),
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    transaction_id TEXT,
    transaction_type VARCHAR(20),
    amount DECIMAL(18, 8),
    currency VARCHAR(10),
    description TEXT,
    rank VARCHAR(50),
    token_type VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wt.transaction_id,
        wt.transaction_type,
        wt.amount,
        wt.currency,
        wt.description,
        (wt.metadata->>'rank')::VARCHAR(50) as rank,
        (wt.metadata->>'token_type')::VARCHAR(10) as token_type,
        wt.created_at
    FROM wallet_transactions wt
    WHERE wt.user_email = user_email_param
    AND wt.transaction_type = 'bonus'
    AND wt.metadata->>'bonus_type' = 'ranking_bonus'
    ORDER BY wt.created_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to check if user qualifies for ranking bonus
CREATE OR REPLACE FUNCTION check_ranking_qualification(
    user_email_param VARCHAR(255)
)
RETURNS TABLE (
    qualifies BOOLEAN,
    current_rank VARCHAR(50),
    direct_referrals INTEGER,
    max_level INTEGER,
    monthly_bonus DECIMAL(18, 8)
) AS $$
DECLARE
    direct_count INTEGER;
    max_depth INTEGER;
    rank_name VARCHAR(50);
    bonus_amount DECIMAL(18, 8);
BEGIN
    -- Get direct referrals count
    SELECT COUNT(*)::INTEGER INTO direct_count
    FROM referral_relationships
    WHERE referrer_email = user_email_param 
    AND level_depth = 1 
    AND is_active = true;

    -- Get maximum level depth
    SELECT COALESCE(MAX(level_depth), 0)::INTEGER INTO max_depth
    FROM referral_relationships
    WHERE referrer_email = user_email_param 
    AND is_active = true;

    -- Determine rank and bonus based on requirements
    IF max_depth >= 10 THEN
        IF direct_count >= 12 THEN
            rank_name := 'Diamond';
            bonus_amount := 14904;
        ELSIF direct_count >= 8 THEN
            rank_name := 'Platinum';
            bonus_amount := 8832;
        ELSIF direct_count >= 6 THEN
            rank_name := 'Gold';
            bonus_amount := 4830;
        ELSIF direct_count >= 5 THEN
            rank_name := 'Bronze'; -- Could be Silver with 3-group system
            bonus_amount := 690;
        ELSE
            rank_name := 'No Rank';
            bonus_amount := 0;
        END IF;
    ELSE
        rank_name := 'No Rank';
        bonus_amount := 0;
    END IF;

    RETURN QUERY SELECT 
        (bonus_amount > 0) as qualifies,
        rank_name as current_rank,
        direct_count as direct_referrals,
        max_depth as max_level,
        bonus_amount as monthly_bonus;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to check monthly ranking qualification (for compatibility)
CREATE OR REPLACE FUNCTION check_monthly_ranking_qualification(
    user_email_param VARCHAR(255),
    check_month_param DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE (
    qualifies BOOLEAN,
    current_rank VARCHAR(50),
    direct_referrals INTEGER,
    max_level INTEGER,
    monthly_bonus DECIMAL(18, 8),
    qualification_status VARCHAR(50),
    missing_requirements TEXT[]
) AS $$
DECLARE
    direct_count INTEGER;
    max_depth INTEGER;
    rank_name VARCHAR(50);
    bonus_amount DECIMAL(18, 8);
    qualification_status_val VARCHAR(50);
    missing_reqs TEXT[] := ARRAY[]::TEXT[];
    has_10th_unilevel BOOLEAN;
BEGIN
    -- Get current referral statistics
    SELECT COUNT(*)::INTEGER INTO direct_count
    FROM referral_relationships
    WHERE referrer_email = user_email_param
    AND level_depth = 1
    AND is_active = true;

    -- Get maximum level depth
    SELECT COALESCE(MAX(level_depth), 0)::INTEGER INTO max_depth
    FROM referral_relationships
    WHERE referrer_email = user_email_param
    AND is_active = true;

    -- Check if has 10th unilevel qualification
    has_10th_unilevel := max_depth >= 10;

    -- Determine rank and bonus based on requirements
    IF has_10th_unilevel THEN
        IF direct_count >= 12 THEN
            rank_name := 'Diamond';
            bonus_amount := 14904;
            qualification_status_val := 'qualified';
        ELSIF direct_count >= 8 THEN
            rank_name := 'Platinum';
            bonus_amount := 8832;
            qualification_status_val := 'qualified';
        ELSIF direct_count >= 6 THEN
            rank_name := 'Gold';
            bonus_amount := 4830;
            qualification_status_val := 'qualified';
        ELSIF direct_count >= 5 THEN
            rank_name := 'Bronze';
            bonus_amount := 690;
            qualification_status_val := 'qualified';
        ELSE
            rank_name := 'No Rank';
            bonus_amount := 0;
            qualification_status_val := 'insufficient_referrals';
            missing_reqs := array_append(missing_reqs, 'Need at least 5 direct referrals (currently ' || direct_count || ')');
        END IF;
    ELSE
        rank_name := 'No Rank';
        bonus_amount := 0;
        qualification_status_val := 'no_10th_unilevel';
        missing_reqs := array_append(missing_reqs, 'Need to reach 10th unilevel (currently level ' || max_depth || ')');

        IF direct_count < 5 THEN
            missing_reqs := array_append(missing_reqs, 'Need at least 5 direct referrals (currently ' || direct_count || ')');
        END IF;
    END IF;

    RETURN QUERY SELECT
        (bonus_amount > 0) as qualifies,
        rank_name as current_rank,
        direct_count as direct_referrals,
        max_depth as max_level,
        bonus_amount as monthly_bonus,
        qualification_status_val as qualification_status,
        missing_reqs as missing_requirements;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to record monthly qualification (simplified version)
CREATE OR REPLACE FUNCTION record_monthly_qualification(
    user_email_param VARCHAR(255),
    qualification_month_param DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- This is a simplified version that just returns true
    -- The full implementation is in database-ranking-maintenance-system.sql
    RETURN TRUE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION credit_tic_ranking_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION credit_gic_ranking_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_ranking_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION get_ranking_bonus_history TO authenticated;
GRANT EXECUTE ON FUNCTION check_ranking_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION check_monthly_ranking_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION record_monthly_qualification TO authenticated;
