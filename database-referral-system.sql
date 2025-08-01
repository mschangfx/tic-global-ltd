-- Referral Commission System for TIC GLOBAL
-- This creates the complete referral tracking and commission structure

-- Create referral relationships table
CREATE TABLE IF NOT EXISTS referral_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_email VARCHAR(255) NOT NULL,
    referred_email VARCHAR(255) NOT NULL,
    referral_code VARCHAR(50) NOT NULL,
    level_depth INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(referrer_email, referred_email)
);

-- Create user plans table to track VIP/Starter plans
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('starter', 'vip')),
    plan_count INTEGER DEFAULT 1,
    plan_value DECIMAL(10, 2) NOT NULL,
    monthly_earnings DECIMAL(10, 2) DEFAULT 0,
    daily_earnings DECIMAL(10, 4) DEFAULT 0,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_user_plans_email (user_email),
    INDEX idx_user_plans_type (plan_type)
);

-- Create referral commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    earner_email VARCHAR(255) NOT NULL,
    referral_email VARCHAR(255) NOT NULL,
    commission_level INTEGER NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    base_earnings DECIMAL(10, 4) NOT NULL,
    commission_amount DECIMAL(10, 4) NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    calculation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_commissions_earner (earner_email),
    INDEX idx_commissions_date (calculation_date),
    INDEX idx_commissions_level (commission_level)
);

-- Create user rankings table
CREATE TABLE IF NOT EXISTS user_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    direct_referrals INTEGER DEFAULT 0,
    total_commission_earned DECIMAL(15, 4) DEFAULT 0,
    monthly_commission DECIMAL(15, 4) DEFAULT 0,
    daily_commission DECIMAL(10, 4) DEFAULT 0,
    max_level_reached INTEGER DEFAULT 0,
    ranking_score DECIMAL(15, 4) DEFAULT 0,
    rank_position INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_rankings_score (ranking_score DESC),
    INDEX idx_rankings_position (rank_position)
);

-- Create commission rates configuration
CREATE TABLE IF NOT EXISTS commission_rates (
    level INTEGER PRIMARY KEY,
    rate_percentage DECIMAL(5, 2) NOT NULL,
    plan_requirement VARCHAR(20) DEFAULT 'starter',
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert commission rates
INSERT INTO commission_rates (level, rate_percentage, plan_requirement) VALUES
(1, 10.00, 'starter'),
(2, 5.00, 'vip'),
(3, 5.00, 'vip'),
(4, 5.00, 'vip'),
(5, 5.00, 'vip'),
(6, 5.00, 'vip'),
(7, 2.50, 'vip'),
(8, 2.50, 'vip'),
(9, 2.50, 'vip'),
(10, 2.50, 'vip'),
(11, 1.00, 'vip'),
(12, 1.00, 'vip'),
(13, 1.00, 'vip'),
(14, 1.00, 'vip'),
(15, 1.00, 'vip')
ON CONFLICT (level) DO UPDATE SET 
    rate_percentage = EXCLUDED.rate_percentage,
    plan_requirement = EXCLUDED.plan_requirement;

-- Function to calculate daily commissions
CREATE OR REPLACE FUNCTION calculate_daily_commissions()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    referral_record RECORD;
    commission_rate DECIMAL(5, 2);
    base_daily_earnings DECIMAL(10, 4);
    commission_amount DECIMAL(10, 4);
    user_plan_type VARCHAR(20);
    max_levels INTEGER;
    total_processed INTEGER := 0;
BEGIN
    -- Clear today's commissions first
    DELETE FROM referral_commissions WHERE calculation_date = CURRENT_DATE;
    
    -- Loop through all users with active plans
    FOR user_record IN 
        SELECT DISTINCT user_email, plan_type, plan_count, daily_earnings
        FROM user_plans 
        WHERE is_active = TRUE AND daily_earnings > 0
    LOOP
        base_daily_earnings := user_record.daily_earnings * user_record.plan_count;
        
        -- Find all users who should earn commission from this user's earnings
        FOR referral_record IN
            WITH RECURSIVE referral_tree AS (
                -- Base case: direct referrals
                SELECT 
                    referrer_email,
                    referred_email,
                    1 as level,
                    referral_code
                FROM referral_relationships 
                WHERE referred_email = user_record.user_email 
                  AND is_active = TRUE
                
                UNION ALL
                
                -- Recursive case: indirect referrals
                SELECT 
                    rr.referrer_email,
                    rt.referred_email,
                    rt.level + 1,
                    rr.referral_code
                FROM referral_relationships rr
                INNER JOIN referral_tree rt ON rr.referred_email = rt.referrer_email
                WHERE rt.level < 15 AND rr.is_active = TRUE
            )
            SELECT 
                rt.referrer_email,
                rt.level,
                up.plan_type as referrer_plan_type
            FROM referral_tree rt
            LEFT JOIN user_plans up ON rt.referrer_email = up.user_email AND up.is_active = TRUE
            ORDER BY rt.level
        LOOP
            -- Determine max levels based on referrer's plan
            max_levels := CASE 
                WHEN referral_record.referrer_plan_type = 'vip' THEN 15
                WHEN referral_record.referrer_plan_type = 'starter' THEN 1
                ELSE 0
            END;
            
            -- Skip if referrer doesn't have required plan for this level
            IF referral_record.level > max_levels THEN
                CONTINUE;
            END IF;
            
            -- Get commission rate for this level
            SELECT rate_percentage INTO commission_rate
            FROM commission_rates 
            WHERE level = referral_record.level AND is_active = TRUE;
            
            IF commission_rate IS NOT NULL THEN
                commission_amount := base_daily_earnings * (commission_rate / 100);
                
                -- Insert commission record
                INSERT INTO referral_commissions (
                    earner_email,
                    referral_email,
                    commission_level,
                    commission_rate,
                    base_earnings,
                    commission_amount,
                    plan_type,
                    calculation_date
                ) VALUES (
                    referral_record.referrer_email,
                    user_record.user_email,
                    referral_record.level,
                    commission_rate,
                    base_daily_earnings,
                    commission_amount,
                    user_record.plan_type,
                    CURRENT_DATE
                );
                
                total_processed := total_processed + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Update user rankings
    PERFORM update_user_rankings();
    
    RETURN total_processed;
END;
$$ LANGUAGE plpgsql;

-- Function to update user rankings
CREATE OR REPLACE FUNCTION update_user_rankings()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    rank_counter INTEGER := 1;
BEGIN
    -- Calculate and update rankings for all users
    FOR user_record IN
        WITH user_stats AS (
            SELECT 
                u.user_email,
                COALESCE(direct_refs.count, 0) as direct_referrals,
                COALESCE(total_refs.count, 0) as total_referrals,
                COALESCE(daily_comm.amount, 0) as daily_commission,
                COALESCE(monthly_comm.amount, 0) as monthly_commission,
                COALESCE(total_comm.amount, 0) as total_commission,
                COALESCE(max_level.level, 0) as max_level_reached,
                -- Ranking score calculation
                (COALESCE(total_refs.count, 0) * 10 + 
                 COALESCE(total_comm.amount, 0) * 100 + 
                 COALESCE(max_level.level, 0) * 50) as ranking_score
            FROM (SELECT DISTINCT user_email FROM user_plans WHERE is_active = TRUE) u
            LEFT JOIN (
                SELECT referrer_email, COUNT(*) as count
                FROM referral_relationships 
                WHERE level_depth = 1 AND is_active = TRUE
                GROUP BY referrer_email
            ) direct_refs ON u.user_email = direct_refs.referrer_email
            LEFT JOIN (
                SELECT referrer_email, COUNT(*) as count
                FROM referral_relationships 
                WHERE is_active = TRUE
                GROUP BY referrer_email
            ) total_refs ON u.user_email = total_refs.referrer_email
            LEFT JOIN (
                SELECT earner_email, SUM(commission_amount) as amount
                FROM referral_commissions 
                WHERE calculation_date = CURRENT_DATE
                GROUP BY earner_email
            ) daily_comm ON u.user_email = daily_comm.earner_email
            LEFT JOIN (
                SELECT earner_email, SUM(commission_amount) as amount
                FROM referral_commissions 
                WHERE calculation_date >= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY earner_email
            ) monthly_comm ON u.user_email = monthly_comm.earner_email
            LEFT JOIN (
                SELECT earner_email, SUM(commission_amount) as amount
                FROM referral_commissions 
                GROUP BY earner_email
            ) total_comm ON u.user_email = total_comm.earner_email
            LEFT JOIN (
                SELECT earner_email, MAX(commission_level) as level
                FROM referral_commissions 
                GROUP BY earner_email
            ) max_level ON u.user_email = max_level.earner_email
        )
        SELECT * FROM user_stats
        ORDER BY ranking_score DESC, total_referrals DESC, total_commission DESC
    LOOP
        -- Insert or update user ranking
        INSERT INTO user_rankings (
            user_email,
            total_referrals,
            direct_referrals,
            total_commission_earned,
            monthly_commission,
            daily_commission,
            max_level_reached,
            ranking_score,
            rank_position,
            last_updated
        ) VALUES (
            user_record.user_email,
            user_record.total_referrals,
            user_record.direct_referrals,
            user_record.total_commission,
            user_record.monthly_commission,
            user_record.daily_commission,
            user_record.max_level_reached,
            user_record.ranking_score,
            rank_counter,
            NOW()
        ) ON CONFLICT (user_email) DO UPDATE SET
            total_referrals = EXCLUDED.total_referrals,
            direct_referrals = EXCLUDED.direct_referrals,
            total_commission_earned = EXCLUDED.total_commission_earned,
            monthly_commission = EXCLUDED.monthly_commission,
            daily_commission = EXCLUDED.daily_commission,
            max_level_reached = EXCLUDED.max_level_reached,
            ranking_score = EXCLUDED.ranking_score,
            rank_position = EXCLUDED.rank_position,
            last_updated = EXCLUDED.last_updated;
            
        rank_counter := rank_counter + 1;
    END LOOP;
    
    RETURN rank_counter - 1;
END;
$$ LANGUAGE plpgsql;

-- Function to add a new referral relationship
CREATE OR REPLACE FUNCTION add_referral_relationship(
    referrer_email_param VARCHAR(255),
    referred_email_param VARCHAR(255),
    referral_code_param VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert the direct relationship
    INSERT INTO referral_relationships (
        referrer_email,
        referred_email,
        referral_code,
        level_depth
    ) VALUES (
        referrer_email_param,
        referred_email_param,
        referral_code_param,
        1
    ) ON CONFLICT (referrer_email, referred_email) DO NOTHING;
    
    -- Build the complete referral tree for this new relationship
    WITH RECURSIVE referral_tree AS (
        -- Find the referrer's upline
        SELECT 
            referrer_email,
            referred_email,
            level_depth
        FROM referral_relationships 
        WHERE referred_email = referrer_email_param
        
        UNION ALL
        
        SELECT 
            rr.referrer_email,
            rt.referred_email,
            rt.level_depth + 1
        FROM referral_relationships rr
        INNER JOIN referral_tree rt ON rr.referred_email = rt.referrer_email
        WHERE rt.level_depth < 15
    )
    INSERT INTO referral_relationships (
        referrer_email,
        referred_email,
        referral_code,
        level_depth
    )
    SELECT 
        rt.referrer_email,
        referred_email_param,
        referral_code_param,
        rt.level_depth + 1
    FROM referral_tree rt
    ON CONFLICT (referrer_email, referred_email) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
