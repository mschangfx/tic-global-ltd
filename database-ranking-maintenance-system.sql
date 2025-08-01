-- Database system for ranking qualification maintenance
-- Users must maintain qualifications monthly to remain eligible for bonuses

-- 1. Create table to track monthly ranking qualifications
CREATE TABLE IF NOT EXISTS monthly_ranking_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    qualification_month DATE NOT NULL, -- First day of the month (e.g., 2024-01-01)
    rank_achieved VARCHAR(50) NOT NULL,
    direct_referrals INTEGER NOT NULL,
    max_unilevel_depth INTEGER NOT NULL,
    total_volume DECIMAL(18, 8) DEFAULT 0,
    qualifies_for_bonus BOOLEAN NOT NULL DEFAULT false,
    bonus_amount DECIMAL(18, 8) DEFAULT 0,
    bonus_distributed BOOLEAN DEFAULT false,
    bonus_distributed_at TIMESTAMP,
    qualification_data JSONB, -- Store detailed qualification info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_email, qualification_month)
);

-- 2. Create table to track ranking history and changes
CREATE TABLE IF NOT EXISTS user_ranking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    previous_rank VARCHAR(50),
    new_rank VARCHAR(50) NOT NULL,
    rank_change_type VARCHAR(20) NOT NULL, -- 'promotion', 'demotion', 'maintained'
    qualification_month DATE NOT NULL,
    direct_referrals INTEGER NOT NULL,
    max_unilevel_depth INTEGER NOT NULL,
    qualification_lost_reason TEXT, -- Why qualification was lost
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Function to check current month qualification
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
            -- Could be Bronze or Silver - for now defaulting to Bronze
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

-- 4. Function to record monthly qualification
CREATE OR REPLACE FUNCTION record_monthly_qualification(
    user_email_param VARCHAR(255),
    qualification_month_param DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    qual_data RECORD;
    previous_rank VARCHAR(50);
    rank_change_type VARCHAR(20);
BEGIN
    -- Get current qualification
    SELECT * INTO qual_data
    FROM check_monthly_ranking_qualification(user_email_param, qualification_month_param);

    -- Get previous month's rank for comparison
    SELECT rank_achieved INTO previous_rank
    FROM monthly_ranking_qualifications
    WHERE user_email = user_email_param
    AND qualification_month = qualification_month_param - INTERVAL '1 month'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Determine rank change type
    IF previous_rank IS NULL THEN
        rank_change_type := 'initial';
    ELSIF previous_rank = qual_data.current_rank THEN
        rank_change_type := 'maintained';
    ELSIF qual_data.current_rank = 'No Rank' THEN
        rank_change_type := 'lost';
    ELSE
        -- Compare rank hierarchy
        CASE 
            WHEN (previous_rank = 'Bronze' AND qual_data.current_rank IN ('Silver', 'Gold', 'Platinum', 'Diamond')) OR
                 (previous_rank = 'Silver' AND qual_data.current_rank IN ('Gold', 'Platinum', 'Diamond')) OR
                 (previous_rank = 'Gold' AND qual_data.current_rank IN ('Platinum', 'Diamond')) OR
                 (previous_rank = 'Platinum' AND qual_data.current_rank = 'Diamond') THEN
                rank_change_type := 'promotion';
            WHEN (previous_rank IN ('Silver', 'Gold', 'Platinum', 'Diamond') AND qual_data.current_rank = 'Bronze') OR
                 (previous_rank IN ('Gold', 'Platinum', 'Diamond') AND qual_data.current_rank = 'Silver') OR
                 (previous_rank IN ('Platinum', 'Diamond') AND qual_data.current_rank = 'Gold') OR
                 (previous_rank = 'Diamond' AND qual_data.current_rank = 'Platinum') THEN
                rank_change_type := 'demotion';
            ELSE
                rank_change_type := 'maintained';
        END CASE;
    END IF;

    -- Insert or update monthly qualification record
    INSERT INTO monthly_ranking_qualifications (
        user_email,
        qualification_month,
        rank_achieved,
        direct_referrals,
        max_unilevel_depth,
        qualifies_for_bonus,
        bonus_amount,
        qualification_data
    ) VALUES (
        user_email_param,
        qualification_month_param,
        qual_data.current_rank,
        qual_data.direct_referrals,
        qual_data.max_level,
        qual_data.qualifies,
        qual_data.monthly_bonus,
        jsonb_build_object(
            'qualification_status', qual_data.qualification_status,
            'missing_requirements', qual_data.missing_requirements,
            'check_date', NOW()
        )
    )
    ON CONFLICT (user_email, qualification_month)
    DO UPDATE SET
        rank_achieved = EXCLUDED.rank_achieved,
        direct_referrals = EXCLUDED.direct_referrals,
        max_unilevel_depth = EXCLUDED.max_unilevel_depth,
        qualifies_for_bonus = EXCLUDED.qualifies_for_bonus,
        bonus_amount = EXCLUDED.bonus_amount,
        qualification_data = EXCLUDED.qualification_data,
        updated_at = NOW();

    -- Record ranking history
    INSERT INTO user_ranking_history (
        user_email,
        previous_rank,
        new_rank,
        rank_change_type,
        qualification_month,
        direct_referrals,
        max_unilevel_depth,
        qualification_lost_reason
    ) VALUES (
        user_email_param,
        previous_rank,
        qual_data.current_rank,
        rank_change_type,
        qualification_month_param,
        qual_data.direct_referrals,
        qual_data.max_level,
        CASE 
            WHEN NOT qual_data.qualifies THEN array_to_string(qual_data.missing_requirements, '; ')
            ELSE NULL
        END
    );

    RETURN TRUE;
END;
$$;

-- 5. Function to check if user is eligible for bonus distribution
CREATE OR REPLACE FUNCTION is_eligible_for_bonus(
    user_email_param VARCHAR(255),
    check_month_param DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE (
    eligible BOOLEAN,
    rank VARCHAR(50),
    bonus_amount DECIMAL(18, 8),
    already_distributed BOOLEAN,
    eligibility_reason TEXT
) AS $$
DECLARE
    qualification_record RECORD;
    reason_text TEXT;
BEGIN
    -- Get qualification record for the month
    SELECT * INTO qualification_record
    FROM monthly_ranking_qualifications
    WHERE user_email = user_email_param
    AND qualification_month = check_month_param;

    IF qualification_record IS NULL THEN
        -- No qualification record - need to check and record
        PERFORM record_monthly_qualification(user_email_param, check_month_param);
        
        -- Get the newly created record
        SELECT * INTO qualification_record
        FROM monthly_ranking_qualifications
        WHERE user_email = user_email_param
        AND qualification_month = check_month_param;
    END IF;

    -- Determine eligibility
    IF qualification_record.qualifies_for_bonus AND NOT qualification_record.bonus_distributed THEN
        reason_text := 'Qualified for ' || qualification_record.rank_achieved || ' rank bonus';
        
        RETURN QUERY SELECT 
            true as eligible,
            qualification_record.rank_achieved as rank,
            qualification_record.bonus_amount as bonus_amount,
            qualification_record.bonus_distributed as already_distributed,
            reason_text as eligibility_reason;
    ELSIF qualification_record.bonus_distributed THEN
        reason_text := 'Bonus already distributed for ' || qualification_record.rank_achieved || ' rank';
        
        RETURN QUERY SELECT 
            false as eligible,
            qualification_record.rank_achieved as rank,
            qualification_record.bonus_amount as bonus_amount,
            qualification_record.bonus_distributed as already_distributed,
            reason_text as eligibility_reason;
    ELSE
        reason_text := 'Does not qualify for bonus: ' || 
                      COALESCE((qualification_record.qualification_data->>'qualification_status')::TEXT, 'unknown reason');
        
        RETURN QUERY SELECT 
            false as eligible,
            qualification_record.rank_achieved as rank,
            0::DECIMAL(18, 8) as bonus_amount,
            false as already_distributed,
            reason_text as eligibility_reason;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to mark bonus as distributed
CREATE OR REPLACE FUNCTION mark_bonus_distributed(
    user_email_param VARCHAR(255),
    qualification_month_param DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE monthly_ranking_qualifications
    SET 
        bonus_distributed = true,
        bonus_distributed_at = NOW(),
        updated_at = NOW()
    WHERE user_email = user_email_param
    AND qualification_month = qualification_month_param;

    RETURN FOUND;
END;
$$;

-- 7. Function to get user's ranking maintenance status
CREATE OR REPLACE FUNCTION get_ranking_maintenance_status(
    user_email_param VARCHAR(255),
    months_back INTEGER DEFAULT 6
)
RETURNS TABLE (
    qualification_month DATE,
    rank_achieved VARCHAR(50),
    qualifies_for_bonus BOOLEAN,
    bonus_amount DECIMAL(18, 8),
    bonus_distributed BOOLEAN,
    direct_referrals INTEGER,
    max_unilevel_depth INTEGER,
    rank_change_type VARCHAR(20),
    missing_requirements TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mrq.qualification_month,
        mrq.rank_achieved,
        mrq.qualifies_for_bonus,
        mrq.bonus_amount,
        mrq.bonus_distributed,
        mrq.direct_referrals,
        mrq.max_unilevel_depth,
        urh.rank_change_type,
        CASE 
            WHEN mrq.qualification_data ? 'missing_requirements' THEN
                ARRAY(SELECT jsonb_array_elements_text(mrq.qualification_data->'missing_requirements'))
            ELSE ARRAY[]::TEXT[]
        END as missing_requirements
    FROM monthly_ranking_qualifications mrq
    LEFT JOIN user_ranking_history urh ON (
        urh.user_email = mrq.user_email 
        AND urh.qualification_month = mrq.qualification_month
    )
    WHERE mrq.user_email = user_email_param
    AND mrq.qualification_month >= DATE_TRUNC('month', CURRENT_DATE) - (months_back || ' months')::INTERVAL
    ORDER BY mrq.qualification_month DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_qualifications_user_month ON monthly_ranking_qualifications(user_email, qualification_month);
CREATE INDEX IF NOT EXISTS idx_monthly_qualifications_month ON monthly_ranking_qualifications(qualification_month);
CREATE INDEX IF NOT EXISTS idx_ranking_history_user_month ON user_ranking_history(user_email, qualification_month);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON monthly_ranking_qualifications TO authenticated;
GRANT SELECT, INSERT ON user_ranking_history TO authenticated;
GRANT EXECUTE ON FUNCTION check_monthly_ranking_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION record_monthly_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION is_eligible_for_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION mark_bonus_distributed TO authenticated;
GRANT EXECUTE ON FUNCTION get_ranking_maintenance_status TO authenticated;
