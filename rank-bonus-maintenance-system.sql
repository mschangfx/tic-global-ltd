-- RANK BONUS MAINTENANCE SYSTEM
-- This system ensures users maintain their required referral count to receive rank bonuses
-- Users must maintain the minimum referrals throughout the qualification period

-- 1. Create rank maintenance tracking table
CREATE TABLE IF NOT EXISTS rank_maintenance_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    tracking_month VARCHAR(7) NOT NULL, -- YYYY-MM format
    rank_achieved VARCHAR(50),
    referrals_required INTEGER,
    referrals_maintained INTEGER,
    maintenance_days INTEGER DEFAULT 0,
    total_days_in_month INTEGER DEFAULT 30,
    maintenance_percentage DECIMAL(5, 2) DEFAULT 0.00,
    is_qualified BOOLEAN DEFAULT FALSE,
    bonus_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_email, tracking_month)
);

-- 2. Create daily rank maintenance log
CREATE TABLE IF NOT EXISTS daily_rank_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    check_date DATE NOT NULL,
    current_referrals INTEGER NOT NULL,
    required_referrals INTEGER NOT NULL,
    rank_maintained VARCHAR(50),
    is_qualified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_email, check_date)
);

-- 3. Function to check daily rank maintenance
CREATE OR REPLACE FUNCTION check_daily_rank_maintenance(
    user_email_param TEXT,
    check_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    current_referrals INTEGER;
    required_for_bronze INTEGER := 5;
    required_for_silver INTEGER := 10;
    required_for_gold INTEGER := 15;
    required_for_platinum INTEGER := 20;
    required_for_diamond INTEGER := 25;
    maintained_rank TEXT := 'No Rank';
    required_referrals INTEGER := 0;
    is_qualified BOOLEAN := FALSE;
BEGIN
    -- Get user's current active direct referrals
    SELECT COUNT(*) INTO current_referrals
    FROM referral_relationships
    WHERE referrer_email = user_email_param 
    AND level_depth = 1 
    AND is_active = true;
    
    -- Determine highest maintained rank
    IF current_referrals >= required_for_diamond THEN
        maintained_rank := 'Diamond';
        required_referrals := required_for_diamond;
        is_qualified := TRUE;
    ELSIF current_referrals >= required_for_platinum THEN
        maintained_rank := 'Platinum';
        required_referrals := required_for_platinum;
        is_qualified := TRUE;
    ELSIF current_referrals >= required_for_gold THEN
        maintained_rank := 'Gold';
        required_referrals := required_for_gold;
        is_qualified := TRUE;
    ELSIF current_referrals >= required_for_silver THEN
        maintained_rank := 'Silver';
        required_referrals := required_for_silver;
        is_qualified := TRUE;
    ELSIF current_referrals >= required_for_bronze THEN
        maintained_rank := 'Bronze';
        required_referrals := required_for_bronze;
        is_qualified := TRUE;
    ELSE
        maintained_rank := 'No Rank';
        required_referrals := required_for_bronze;
        is_qualified := FALSE;
    END IF;
    
    -- Record daily maintenance check
    INSERT INTO daily_rank_maintenance (
        user_email,
        check_date,
        current_referrals,
        required_referrals,
        rank_maintained,
        is_qualified
    ) VALUES (
        user_email_param,
        check_date_param,
        current_referrals,
        required_referrals,
        maintained_rank,
        is_qualified
    ) ON CONFLICT (user_email, check_date) DO UPDATE SET
        current_referrals = EXCLUDED.current_referrals,
        required_referrals = EXCLUDED.required_referrals,
        rank_maintained = EXCLUDED.rank_maintained,
        is_qualified = EXCLUDED.is_qualified,
        created_at = NOW();
    
    RETURN is_qualified;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to calculate monthly rank maintenance
CREATE OR REPLACE FUNCTION calculate_monthly_rank_maintenance(
    user_email_param TEXT,
    tracking_month_param TEXT
)
RETURNS TABLE(
    rank_achieved TEXT,
    referrals_required INTEGER,
    maintenance_days INTEGER,
    total_days INTEGER,
    maintenance_percentage DECIMAL(5, 2),
    is_qualified BOOLEAN,
    bonus_amount DECIMAL(10, 2)
) AS $$
DECLARE
    month_start DATE;
    month_end DATE;
    total_days_in_month INTEGER;
    qualified_days INTEGER;
    maintenance_pct DECIMAL(5, 2);
    highest_rank TEXT := 'No Rank';
    rank_requirements INTEGER := 0;
    bonus_usd DECIMAL(10, 2) := 0.00;
    min_maintenance_pct DECIMAL(5, 2) := 80.00; -- Must maintain 80% of the month
BEGIN
    -- Calculate month boundaries
    month_start := (tracking_month_param || '-01')::DATE;
    month_end := (month_start + INTERVAL '1 month - 1 day')::DATE;
    total_days_in_month := EXTRACT(DAY FROM month_end);
    
    -- Count days where user maintained qualification
    SELECT COUNT(*) INTO qualified_days
    FROM daily_rank_maintenance
    WHERE user_email = user_email_param
    AND check_date >= month_start
    AND check_date <= month_end
    AND is_qualified = TRUE;
    
    -- Calculate maintenance percentage
    maintenance_pct := (qualified_days::DECIMAL / total_days_in_month::DECIMAL) * 100;
    
    -- Determine highest consistently maintained rank
    SELECT 
        CASE 
            WHEN COUNT(*) FILTER (WHERE rank_maintained = 'Diamond' AND is_qualified = TRUE) >= (total_days_in_month * min_maintenance_pct / 100) THEN 'Diamond'
            WHEN COUNT(*) FILTER (WHERE rank_maintained = 'Platinum' AND is_qualified = TRUE) >= (total_days_in_month * min_maintenance_pct / 100) THEN 'Platinum'
            WHEN COUNT(*) FILTER (WHERE rank_maintained = 'Gold' AND is_qualified = TRUE) >= (total_days_in_month * min_maintenance_pct / 100) THEN 'Gold'
            WHEN COUNT(*) FILTER (WHERE rank_maintained = 'Silver' AND is_qualified = TRUE) >= (total_days_in_month * min_maintenance_pct / 100) THEN 'Silver'
            WHEN COUNT(*) FILTER (WHERE rank_maintained = 'Bronze' AND is_qualified = TRUE) >= (total_days_in_month * min_maintenance_pct / 100) THEN 'Bronze'
            ELSE 'No Rank'
        END INTO highest_rank
    FROM daily_rank_maintenance
    WHERE user_email = user_email_param
    AND check_date >= month_start
    AND check_date <= month_end;
    
    -- Set requirements and bonus based on maintained rank
    CASE highest_rank
        WHEN 'Diamond' THEN
            rank_requirements := 25;
            bonus_usd := 14904.00;
        WHEN 'Platinum' THEN
            rank_requirements := 20;
            bonus_usd := 8832.00;
        WHEN 'Gold' THEN
            rank_requirements := 15;
            bonus_usd := 4830.00;
        WHEN 'Silver' THEN
            rank_requirements := 10;
            bonus_usd := 2484.00;
        WHEN 'Bronze' THEN
            rank_requirements := 5;
            bonus_usd := 690.00;
        ELSE
            rank_requirements := 0;
            bonus_usd := 0.00;
    END CASE;
    
    -- Return results
    RETURN QUERY SELECT 
        highest_rank,
        rank_requirements,
        qualified_days,
        total_days_in_month,
        maintenance_pct,
        (maintenance_pct >= min_maintenance_pct AND bonus_usd > 0),
        bonus_usd;
END;
$$ LANGUAGE plpgsql;

-- 5. Updated rank bonus distribution with maintenance verification
CREATE OR REPLACE FUNCTION process_rank_bonus_with_maintenance_check(
    user_email_param TEXT,
    distribution_month_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    maintenance_result RECORD;
    usd_split_amount DECIMAL(18, 8);
    tic_token_amount DECIMAL(18, 8);
    gic_token_amount DECIMAL(18, 8);
    tic_exchange_rate DECIMAL(18, 8);
    gic_exchange_rate DECIMAL(18, 8);
    tic_transaction_id TEXT;
    gic_transaction_id TEXT;
BEGIN
    -- Calculate monthly maintenance for the user
    SELECT * INTO maintenance_result
    FROM calculate_monthly_rank_maintenance(user_email_param, distribution_month_param);
    
    -- Record maintenance tracking
    INSERT INTO rank_maintenance_tracking (
        user_email,
        tracking_month,
        rank_achieved,
        referrals_required,
        referrals_maintained,
        maintenance_days,
        total_days_in_month,
        maintenance_percentage,
        is_qualified,
        bonus_amount
    ) VALUES (
        user_email_param,
        distribution_month_param,
        maintenance_result.rank_achieved,
        maintenance_result.referrals_required,
        maintenance_result.referrals_required, -- Assuming they maintained the required amount
        maintenance_result.maintenance_days,
        maintenance_result.total_days,
        maintenance_result.maintenance_percentage,
        maintenance_result.is_qualified,
        maintenance_result.bonus_amount
    ) ON CONFLICT (user_email, tracking_month) DO UPDATE SET
        rank_achieved = EXCLUDED.rank_achieved,
        referrals_required = EXCLUDED.referrals_required,
        maintenance_days = EXCLUDED.maintenance_days,
        total_days_in_month = EXCLUDED.total_days_in_month,
        maintenance_percentage = EXCLUDED.maintenance_percentage,
        is_qualified = EXCLUDED.is_qualified,
        bonus_amount = EXCLUDED.bonus_amount,
        updated_at = NOW();
    
    -- Only distribute bonus if user maintained qualification
    IF maintenance_result.is_qualified AND maintenance_result.bonus_amount > 0 THEN
        -- Split USD amount 50/50
        usd_split_amount := maintenance_result.bonus_amount / 2;
        
        -- Get current exchange rates
        tic_exchange_rate := get_token_exchange_rate('TIC');
        gic_exchange_rate := get_token_exchange_rate('GIC');
        
        -- Convert USD to token amounts
        tic_token_amount := convert_usd_to_tokens(usd_split_amount, 'TIC');
        gic_token_amount := convert_usd_to_tokens(usd_split_amount, 'GIC');
        
        -- Create distribution record
        INSERT INTO rank_bonus_distributions (
            user_email,
            rank,
            total_referrals,
            bonus_amount,
            tic_amount,
            gic_amount,
            distribution_month,
            status,
            usd_tic_amount,
            usd_gic_amount,
            tic_exchange_rate,
            gic_exchange_rate,
            maintenance_percentage,
            maintenance_days
        ) VALUES (
            user_email_param,
            maintenance_result.rank_achieved,
            maintenance_result.referrals_required,
            maintenance_result.bonus_amount,
            tic_token_amount,
            gic_token_amount,
            distribution_month_param,
            'pending',
            usd_split_amount,
            usd_split_amount,
            tic_exchange_rate,
            gic_exchange_rate,
            maintenance_result.maintenance_percentage,
            maintenance_result.maintenance_days
        );
        
        -- Generate unique transaction IDs
        tic_transaction_id := 'rank_bonus_tic_' || distribution_month_param || '_' || user_email_param;
        gic_transaction_id := 'rank_bonus_gic_' || distribution_month_param || '_' || user_email_param;

        -- Credit TIC tokens
        PERFORM increment_tic_balance_with_history(
            user_email_param,
            tic_token_amount,
            tic_transaction_id,
            'Rank Bonus - ' || maintenance_result.rank_achieved || ' (' || distribution_month_param || ') - Maintained ' || maintenance_result.maintenance_percentage || '% - $' || usd_split_amount || ' → ' || tic_token_amount || ' TIC'
        );

        -- Credit GIC tokens
        PERFORM increment_gic_balance_with_history(
            user_email_param,
            gic_token_amount,
            gic_transaction_id,
            'Rank Bonus - ' || maintenance_result.rank_achieved || ' (' || distribution_month_param || ') - Maintained ' || maintenance_result.maintenance_percentage || '% - $' || usd_split_amount || ' → ' || gic_token_amount || ' GIC'
        );
        
        -- Update distribution status
        UPDATE rank_bonus_distributions
        SET 
            status = 'completed',
            processed_at = NOW()
        WHERE user_email = user_email_param AND distribution_month = distribution_month_param;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Add maintenance columns to rank_bonus_distributions
ALTER TABLE rank_bonus_distributions 
ADD COLUMN IF NOT EXISTS maintenance_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS maintenance_days INTEGER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON rank_maintenance_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_rank_maintenance TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_rank_maintenance TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_monthly_rank_maintenance TO authenticated;
GRANT EXECUTE ON FUNCTION process_rank_bonus_with_maintenance_check TO authenticated;

-- Comments
COMMENT ON TABLE rank_maintenance_tracking IS 'Tracks monthly rank maintenance for bonus qualification';
COMMENT ON TABLE daily_rank_maintenance IS 'Daily log of rank maintenance status';
COMMENT ON FUNCTION process_rank_bonus_with_maintenance_check IS 'Distributes rank bonuses only if user maintained required referrals for 80% of the month';
