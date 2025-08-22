-- GROUP VOLUME RANK BONUS SYSTEM
-- This system implements the correct rank bonus structure based on:
-- 1. Active player counts in different groups/legs
-- 2. Volume requirements for each group
-- 3. Specific percentage calculations for each rank

-- 1. Create group volume tracking table
CREATE TABLE IF NOT EXISTS user_group_volumes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    group_letter VARCHAR(1) NOT NULL, -- A, B, C, D, E
    group_volume DECIMAL(18, 2) DEFAULT 0.00,
    active_players INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tracking_month VARCHAR(7) NOT NULL, -- YYYY-MM format
    
    UNIQUE(user_email, group_letter, tracking_month)
);

-- 2. Create rank qualification tracking
CREATE TABLE IF NOT EXISTS rank_qualifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    tracking_month VARCHAR(7) NOT NULL,
    total_active_players INTEGER DEFAULT 0,
    total_volume DECIMAL(18, 2) DEFAULT 0.00,
    group_a_volume DECIMAL(18, 2) DEFAULT 0.00,
    group_b_volume DECIMAL(18, 2) DEFAULT 0.00,
    group_c_volume DECIMAL(18, 2) DEFAULT 0.00,
    group_d_volume DECIMAL(18, 2) DEFAULT 0.00,
    group_e_volume DECIMAL(18, 2) DEFAULT 0.00,
    group_a_players INTEGER DEFAULT 0,
    group_b_players INTEGER DEFAULT 0,
    group_c_players INTEGER DEFAULT 0,
    group_d_players INTEGER DEFAULT 0,
    group_e_players INTEGER DEFAULT 0,
    qualified_rank VARCHAR(50) DEFAULT 'No Rank',
    bonus_percentage DECIMAL(5, 2) DEFAULT 0.00,
    bonus_amount DECIMAL(18, 2) DEFAULT 0.00,
    is_qualified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_email, tracking_month)
);

-- 3. Function to calculate group volumes and active players
CREATE OR REPLACE FUNCTION calculate_user_group_volumes(
    user_email_param TEXT,
    tracking_month_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    referral_record RECORD;
    group_assignment VARCHAR(1);
    group_counter INTEGER := 0;
    total_referrals INTEGER;
BEGIN
    -- Clear existing group volume data for this month
    DELETE FROM user_group_volumes 
    WHERE user_email = user_email_param AND tracking_month = tracking_month_param;
    
    -- Get all direct referrals for this user
    FOR referral_record IN 
        SELECT rr.referred_email, COUNT(us.id) as active_subscriptions,
               COALESCE(SUM(CASE WHEN us.plan_id = 'vip' THEN 500 ELSE 100 END), 0) as user_volume
        FROM referral_relationships rr
        LEFT JOIN user_subscriptions us ON rr.referred_email = us.user_email 
            AND us.status = 'active' 
            AND us.end_date >= NOW()
        WHERE rr.referrer_email = user_email_param 
            AND rr.level_depth = 1 
            AND rr.is_active = true
        GROUP BY rr.referred_email
        ORDER BY rr.created_at
    LOOP
        -- Assign to groups in round-robin fashion (A, B, C, D, E)
        group_counter := group_counter + 1;
        CASE (group_counter - 1) % 5
            WHEN 0 THEN group_assignment := 'A';
            WHEN 1 THEN group_assignment := 'B';
            WHEN 2 THEN group_assignment := 'C';
            WHEN 3 THEN group_assignment := 'D';
            WHEN 4 THEN group_assignment := 'E';
        END CASE;
        
        -- Insert or update group volume
        INSERT INTO user_group_volumes (
            user_email,
            group_letter,
            group_volume,
            active_players,
            tracking_month
        ) VALUES (
            user_email_param,
            group_assignment,
            referral_record.user_volume,
            CASE WHEN referral_record.active_subscriptions > 0 THEN 1 ELSE 0 END,
            tracking_month_param
        ) ON CONFLICT (user_email, group_letter, tracking_month) DO UPDATE SET
            group_volume = user_group_volumes.group_volume + EXCLUDED.group_volume,
            active_players = user_group_volumes.active_players + EXCLUDED.active_players,
            last_updated = NOW();
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to determine rank qualification based on group volumes
CREATE OR REPLACE FUNCTION determine_rank_qualification(
    user_email_param TEXT,
    tracking_month_param TEXT
)
RETURNS TABLE(
    qualified_rank TEXT,
    bonus_percentage DECIMAL(5, 2),
    bonus_amount DECIMAL(18, 2),
    is_qualified BOOLEAN,
    total_volume DECIMAL(18, 2),
    total_active_players INTEGER
) AS $$
DECLARE
    group_volumes RECORD;
    total_vol DECIMAL(18, 2) := 0.00;
    total_players INTEGER := 0;
    rank_achieved TEXT := 'No Rank';
    bonus_pct DECIMAL(5, 2) := 0.00;
    bonus_amt DECIMAL(18, 2) := 0.00;
    is_qual BOOLEAN := FALSE;
BEGIN
    -- Get group volume summary
    SELECT 
        COALESCE(SUM(CASE WHEN group_letter = 'A' THEN group_volume END), 0) as vol_a,
        COALESCE(SUM(CASE WHEN group_letter = 'B' THEN group_volume END), 0) as vol_b,
        COALESCE(SUM(CASE WHEN group_letter = 'C' THEN group_volume END), 0) as vol_c,
        COALESCE(SUM(CASE WHEN group_letter = 'D' THEN group_volume END), 0) as vol_d,
        COALESCE(SUM(CASE WHEN group_letter = 'E' THEN group_volume END), 0) as vol_e,
        COALESCE(SUM(CASE WHEN group_letter = 'A' THEN active_players END), 0) as players_a,
        COALESCE(SUM(CASE WHEN group_letter = 'B' THEN active_players END), 0) as players_b,
        COALESCE(SUM(CASE WHEN group_letter = 'C' THEN active_players END), 0) as players_c,
        COALESCE(SUM(CASE WHEN group_letter = 'D' THEN active_players END), 0) as players_d,
        COALESCE(SUM(CASE WHEN group_letter = 'E' THEN active_players END), 0) as players_e,
        COALESCE(SUM(group_volume), 0) as total_volume,
        COALESCE(SUM(active_players), 0) as total_active_players
    INTO group_volumes
    FROM user_group_volumes
    WHERE user_email = user_email_param AND tracking_month = tracking_month_param;
    
    total_vol := group_volumes.total_volume;
    total_players := group_volumes.total_active_players;
    
    -- DIAMOND: 12 active players in 5 groups, $165,600 total volume
    -- A=$33,120, B+C+D+E=$32,970 each, 9% bonus
    IF total_players >= 12 AND 
       group_volumes.players_a >= 1 AND group_volumes.players_b >= 1 AND 
       group_volumes.players_c >= 1 AND group_volumes.players_d >= 1 AND group_volumes.players_e >= 1 AND
       total_vol >= 165600 AND
       group_volumes.vol_a >= 33120 AND group_volumes.vol_b >= 32970 AND 
       group_volumes.vol_c >= 32970 AND group_volumes.vol_d >= 32970 AND group_volumes.vol_e >= 32970 THEN
        rank_achieved := 'Diamond';
        bonus_pct := 9.00;
        bonus_amt := total_vol * 0.09;
        is_qual := TRUE;
    
    -- PLATINUM: 8 active players in 4 groups, $110,400 total volume
    -- A=$27,600, B+C+D+E=$1,380+$1,380+$40,020+$40,020, 8% bonus
    ELSIF total_players >= 8 AND 
          group_volumes.players_a >= 1 AND group_volumes.players_b >= 1 AND 
          group_volumes.players_c >= 1 AND group_volumes.players_d >= 1 AND
          total_vol >= 110400 AND
          group_volumes.vol_a >= 27600 AND group_volumes.vol_b >= 1380 AND 
          group_volumes.vol_c >= 1380 AND group_volumes.vol_d >= 40020 THEN
        rank_achieved := 'Platinum';
        bonus_pct := 8.00;
        bonus_amt := total_vol * 0.08;
        is_qual := TRUE;
    
    -- GOLD: 6 active players in 3 groups, $69,000 total volume
    -- A=$23,000, B+C+D+E=$4,140+$11,500+$11,500+$18,860, 7% bonus
    ELSIF total_players >= 6 AND 
          group_volumes.players_a >= 1 AND group_volumes.players_b >= 1 AND group_volumes.players_c >= 1 AND
          total_vol >= 69000 AND
          group_volumes.vol_a >= 23000 AND group_volumes.vol_b >= 4140 AND group_volumes.vol_c >= 11500 THEN
        rank_achieved := 'Gold';
        bonus_pct := 7.00;
        bonus_amt := total_vol * 0.07;
        is_qual := TRUE;
    
    -- SILVER: 5 active players in 3 groups, $41,400 total volume
    -- A=$13,800, B+C+D+E=$6,900+$6,900+$1,380+$12,420, 6% bonus
    ELSIF total_players >= 5 AND 
          group_volumes.players_a >= 1 AND group_volumes.players_b >= 1 AND group_volumes.players_c >= 1 AND
          total_vol >= 41400 AND
          group_volumes.vol_a >= 13800 AND group_volumes.vol_b >= 6900 AND group_volumes.vol_c >= 6900 THEN
        rank_achieved := 'Silver';
        bonus_pct := 6.00;
        bonus_amt := total_vol * 0.06;
        is_qual := TRUE;
    
    -- BRONZE: 5 active players in 2 groups, $13,800 total volume
    -- A=$6,900, B+C+D+E=$1,380+$1,380+$1,380+$2,760, 5% bonus
    ELSIF total_players >= 5 AND 
          group_volumes.players_a >= 1 AND group_volumes.players_b >= 1 AND
          total_vol >= 13800 AND
          group_volumes.vol_a >= 6900 AND group_volumes.vol_b >= 1380 THEN
        rank_achieved := 'Bronze';
        bonus_pct := 5.00;
        bonus_amt := total_vol * 0.05;
        is_qual := TRUE;
    END IF;
    
    -- Store qualification results
    INSERT INTO rank_qualifications (
        user_email,
        tracking_month,
        total_active_players,
        total_volume,
        group_a_volume,
        group_b_volume,
        group_c_volume,
        group_d_volume,
        group_e_volume,
        group_a_players,
        group_b_players,
        group_c_players,
        group_d_players,
        group_e_players,
        qualified_rank,
        bonus_percentage,
        bonus_amount,
        is_qualified
    ) VALUES (
        user_email_param,
        tracking_month_param,
        total_players,
        total_vol,
        group_volumes.vol_a,
        group_volumes.vol_b,
        group_volumes.vol_c,
        group_volumes.vol_d,
        group_volumes.vol_e,
        group_volumes.players_a,
        group_volumes.players_b,
        group_volumes.players_c,
        group_volumes.players_d,
        group_volumes.players_e,
        rank_achieved,
        bonus_pct,
        bonus_amt,
        is_qual
    ) ON CONFLICT (user_email, tracking_month) DO UPDATE SET
        total_active_players = EXCLUDED.total_active_players,
        total_volume = EXCLUDED.total_volume,
        group_a_volume = EXCLUDED.group_a_volume,
        group_b_volume = EXCLUDED.group_b_volume,
        group_c_volume = EXCLUDED.group_c_volume,
        group_d_volume = EXCLUDED.group_d_volume,
        group_e_volume = EXCLUDED.group_e_volume,
        group_a_players = EXCLUDED.group_a_players,
        group_b_players = EXCLUDED.group_b_players,
        group_c_players = EXCLUDED.group_c_players,
        group_d_players = EXCLUDED.group_d_players,
        group_e_players = EXCLUDED.group_e_players,
        qualified_rank = EXCLUDED.qualified_rank,
        bonus_percentage = EXCLUDED.bonus_percentage,
        bonus_amount = EXCLUDED.bonus_amount,
        is_qualified = EXCLUDED.is_qualified,
        updated_at = NOW();
    
    -- Return results
    RETURN QUERY SELECT 
        rank_achieved,
        bonus_pct,
        bonus_amt,
        is_qual,
        total_vol,
        total_players;
END;
$$ LANGUAGE plpgsql;

-- 5. Updated rank bonus distribution with group volume verification
CREATE OR REPLACE FUNCTION process_group_volume_rank_bonus(
    user_email_param TEXT,
    distribution_month_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    qualification_result RECORD;
    usd_split_amount DECIMAL(18, 8);
    tic_token_amount DECIMAL(18, 8);
    gic_token_amount DECIMAL(18, 8);
    tic_exchange_rate DECIMAL(18, 8);
    gic_exchange_rate DECIMAL(18, 8);
    tic_transaction_id TEXT;
    gic_transaction_id TEXT;
BEGIN
    -- Calculate group volumes first
    PERFORM calculate_user_group_volumes(user_email_param, distribution_month_param);
    
    -- Determine rank qualification
    SELECT * INTO qualification_result
    FROM determine_rank_qualification(user_email_param, distribution_month_param);
    
    -- Only distribute bonus if user is qualified
    IF qualification_result.is_qualified AND qualification_result.bonus_amount > 0 THEN
        -- Split USD amount 50/50
        usd_split_amount := qualification_result.bonus_amount / 2;
        
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
            group_volume_total,
            active_players_total
        ) VALUES (
            user_email_param,
            qualification_result.qualified_rank,
            qualification_result.total_active_players,
            qualification_result.bonus_amount,
            tic_token_amount,
            gic_token_amount,
            distribution_month_param,
            'pending',
            usd_split_amount,
            usd_split_amount,
            tic_exchange_rate,
            gic_exchange_rate,
            qualification_result.total_volume,
            qualification_result.total_active_players
        );
        
        -- Generate unique transaction IDs
        tic_transaction_id := 'group_rank_bonus_tic_' || distribution_month_param || '_' || user_email_param;
        gic_transaction_id := 'group_rank_bonus_gic_' || distribution_month_param || '_' || user_email_param;

        -- Credit TIC tokens
        PERFORM increment_tic_balance_with_history(
            user_email_param,
            tic_token_amount,
            tic_transaction_id,
            'Group Volume Rank Bonus - ' || qualification_result.qualified_rank || ' (' || distribution_month_param || ') - $' || qualification_result.total_volume || ' volume × ' || qualification_result.bonus_percentage || '% = $' || usd_split_amount || ' → ' || tic_token_amount || ' TIC'
        );

        -- Credit GIC tokens
        PERFORM increment_gic_balance_with_history(
            user_email_param,
            gic_token_amount,
            gic_transaction_id,
            'Group Volume Rank Bonus - ' || qualification_result.qualified_rank || ' (' || distribution_month_param || ') - $' || qualification_result.total_volume || ' volume × ' || qualification_result.bonus_percentage || '% = $' || usd_split_amount || ' → ' || gic_token_amount || ' GIC'
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

-- 6. Add group volume columns to rank_bonus_distributions
ALTER TABLE rank_bonus_distributions 
ADD COLUMN IF NOT EXISTS group_volume_total DECIMAL(18, 2),
ADD COLUMN IF NOT EXISTS active_players_total INTEGER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_group_volumes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rank_qualifications TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_group_volumes TO authenticated;
GRANT EXECUTE ON FUNCTION determine_rank_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION process_group_volume_rank_bonus TO authenticated;

-- Comments
COMMENT ON TABLE user_group_volumes IS 'Tracks volume and active players for each group (A,B,C,D,E)';
COMMENT ON TABLE rank_qualifications IS 'Stores rank qualification results based on group volumes';
COMMENT ON FUNCTION process_group_volume_rank_bonus IS 'Distributes rank bonuses based on group volume requirements';
