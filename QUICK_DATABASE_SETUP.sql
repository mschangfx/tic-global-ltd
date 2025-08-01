-- Quick Database Setup for Ranking Bonus System
-- Run this in Supabase SQL Editor to fix the missing functions

-- 1. Create monthly_ranking_qualifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS monthly_ranking_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    qualification_month DATE NOT NULL,
    rank_achieved VARCHAR(50) NOT NULL,
    direct_referrals INTEGER NOT NULL,
    max_unilevel_depth INTEGER NOT NULL,
    total_volume DECIMAL(18, 8) DEFAULT 0,
    qualifies_for_bonus BOOLEAN NOT NULL DEFAULT false,
    bonus_amount DECIMAL(18, 8) DEFAULT 0,
    bonus_distributed BOOLEAN DEFAULT false,
    bonus_distributed_at TIMESTAMP,
    qualification_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, qualification_month)
);

-- 2. Create user_ranking_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_ranking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    previous_rank VARCHAR(50),
    new_rank VARCHAR(50) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'promotion', 'demotion', 'maintained'
    change_date DATE NOT NULL,
    direct_referrals INTEGER NOT NULL,
    max_unilevel_depth INTEGER NOT NULL,
    qualification_met BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Function to check monthly ranking qualification
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

-- 4. Function to get ranking maintenance status
CREATE OR REPLACE FUNCTION get_ranking_maintenance_status(
    user_email_param VARCHAR(255),
    months_back INTEGER DEFAULT 6
)
RETURNS TABLE (
    total_months_tracked INTEGER,
    months_qualified INTEGER,
    qualification_rate DECIMAL(5,2),
    current_streak INTEGER,
    longest_streak INTEGER,
    recent_qualifications JSONB,
    rank_changes JSONB,
    performance_trend VARCHAR(20)
) AS $$
DECLARE
    start_date DATE;
    total_tracked INTEGER := 0;
    qualified_count INTEGER := 0;
    current_streak_count INTEGER := 0;
    longest_streak_count INTEGER := 0;
    temp_streak INTEGER := 0;
    recent_quals JSONB;
    rank_change_data JSONB;
    trend VARCHAR(20);
BEGIN
    -- Calculate start date
    start_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * months_back;
    
    -- Get total months tracked
    SELECT COUNT(*) INTO total_tracked
    FROM monthly_ranking_qualifications
    WHERE user_email = user_email_param
    AND qualification_month >= start_date;
    
    -- Get qualified months count
    SELECT COUNT(*) INTO qualified_count
    FROM monthly_ranking_qualifications
    WHERE user_email = user_email_param
    AND qualification_month >= start_date
    AND qualifies_for_bonus = true;
    
    -- Calculate current streak (consecutive qualified months from most recent)
    WITH recent_months AS (
        SELECT qualification_month, qualifies_for_bonus,
               ROW_NUMBER() OVER (ORDER BY qualification_month DESC) as rn
        FROM monthly_ranking_qualifications
        WHERE user_email = user_email_param
        AND qualification_month >= start_date
        ORDER BY qualification_month DESC
    )
    SELECT COUNT(*) INTO current_streak_count
    FROM recent_months
    WHERE rn <= (
        SELECT COALESCE(MIN(rn), 0)
        FROM recent_months
        WHERE qualifies_for_bonus = false
    ) - 1
    AND qualifies_for_bonus = true;
    
    -- Get recent qualifications data
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'month', qualification_month,
                'rank', rank_achieved,
                'qualified', qualifies_for_bonus,
                'bonus_amount', bonus_amount,
                'direct_referrals', direct_referrals
            ) ORDER BY qualification_month DESC
        ), '[]'::json
    )::jsonb INTO recent_quals
    FROM monthly_ranking_qualifications
    WHERE user_email = user_email_param
    AND qualification_month >= start_date;
    
    -- Get rank changes data
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'date', change_date,
                'from_rank', previous_rank,
                'to_rank', new_rank,
                'change_type', change_type
            ) ORDER BY change_date DESC
        ), '[]'::json
    )::jsonb INTO rank_change_data
    FROM user_ranking_history
    WHERE user_email = user_email_param
    AND change_date >= start_date;
    
    -- Determine performance trend
    IF qualified_count >= total_tracked * 0.8 THEN
        trend := 'excellent';
    ELSIF qualified_count >= total_tracked * 0.6 THEN
        trend := 'good';
    ELSIF qualified_count >= total_tracked * 0.4 THEN
        trend := 'average';
    ELSE
        trend := 'needs_improvement';
    END IF;
    
    RETURN QUERY SELECT
        COALESCE(total_tracked, 0) as total_months_tracked,
        COALESCE(qualified_count, 0) as months_qualified,
        CASE 
            WHEN total_tracked > 0 THEN ROUND((qualified_count::DECIMAL / total_tracked::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL(5,2)
        END as qualification_rate,
        COALESCE(current_streak_count, 0) as current_streak,
        COALESCE(longest_streak_count, 0) as longest_streak,
        COALESCE(recent_quals, '[]'::jsonb) as recent_qualifications,
        COALESCE(rank_change_data, '[]'::jsonb) as rank_changes,
        COALESCE(trend, 'unknown') as performance_trend;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_monthly_ranking_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION get_ranking_maintenance_status TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_qualifications_user_month 
ON monthly_ranking_qualifications(user_email, qualification_month);

CREATE INDEX IF NOT EXISTS idx_ranking_history_user_date 
ON user_ranking_history(user_email, change_date);

-- Success message
SELECT 'Database setup complete! Ranking bonus functions are now available.' as status;
