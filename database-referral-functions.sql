-- Database functions for referral system

-- Function to update referral earnings
CREATE OR REPLACE FUNCTION update_referral_earnings(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(10,4)
)
RETURNS VOID AS $$
BEGIN
    -- Update or insert referral earnings
    INSERT INTO user_referral_codes (
        user_email,
        referral_code,
        referral_link,
        total_referrals,
        total_earnings,
        created_at,
        updated_at
    )
    VALUES (
        user_email_param,
        COALESCE((SELECT referral_code FROM user_referral_codes WHERE user_email = user_email_param), 'TEMP' || EXTRACT(EPOCH FROM NOW())::TEXT),
        COALESCE((SELECT referral_link FROM user_referral_codes WHERE user_email = user_email_param), 'https://ticglobal.com/join?ref=TEMP'),
        COALESCE((SELECT total_referrals FROM user_referral_codes WHERE user_email = user_email_param), 0),
        amount_param,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_email) 
    DO UPDATE SET
        total_earnings = user_referral_codes.total_earnings + amount_param,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily commissions for all users
CREATE OR REPLACE FUNCTION calculate_daily_commissions()
RETURNS INTEGER AS $$
DECLARE
    commission_count INTEGER := 0;
    plan_record RECORD;
    referrer_record RECORD;
    commission_amount DECIMAL(10,4);
    daily_earnings DECIMAL(10,4) := 0.44; -- $0.44 per VIP plan daily
BEGIN
    -- Loop through all active VIP plans
    FOR plan_record IN 
        SELECT user_email, plan_count, plan_value
        FROM user_plans 
        WHERE is_active = true AND plan_type = 'vip'
    LOOP
        -- Get referrers for this user (levels 1 and 2 only)
        FOR referrer_record IN
            SELECT referrer_email, level_depth
            FROM referral_relationships
            WHERE referred_email = plan_record.user_email 
            AND is_active = true 
            AND level_depth <= 2
            ORDER BY level_depth
        LOOP
            -- Calculate commission based on level
            IF referrer_record.level_depth = 1 THEN
                commission_amount := daily_earnings * 0.10 * plan_record.plan_count; -- 10% for level 1
            ELSIF referrer_record.level_depth = 2 THEN
                commission_amount := daily_earnings * 0.05 * plan_record.plan_count; -- 5% for level 2
            ELSE
                CONTINUE;
            END IF;

            -- Insert commission record
            INSERT INTO referral_commissions (
                earner_email,
                referral_email,
                commission_level,
                commission_rate,
                base_earnings,
                commission_amount,
                plan_type,
                calculation_date,
                created_at
            ) VALUES (
                referrer_record.referrer_email,
                plan_record.user_email,
                referrer_record.level_depth,
                CASE WHEN referrer_record.level_depth = 1 THEN 10.0 ELSE 5.0 END,
                daily_earnings,
                commission_amount,
                'vip',
                CURRENT_DATE,
                NOW()
            );

            -- Update referrer's total earnings
            PERFORM update_referral_earnings(referrer_record.referrer_email, commission_amount);

            commission_count := commission_count + 1;
        END LOOP;
    END LOOP;

    RETURN commission_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get referral statistics for a user
CREATE OR REPLACE FUNCTION get_referral_stats(user_email_param VARCHAR(255))
RETURNS TABLE (
    total_referrals INTEGER,
    direct_referrals INTEGER,
    total_earnings DECIMAL(10,4),
    monthly_earnings DECIMAL(10,4),
    current_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM referral_relationships 
            WHERE referrer_email = user_email_param AND is_active = true
        ), 0) as total_referrals,
        
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM referral_relationships 
            WHERE referrer_email = user_email_param AND level_depth = 1 AND is_active = true
        ), 0) as direct_referrals,
        
        COALESCE((
            SELECT SUM(commission_amount)
            FROM referral_commissions 
            WHERE earner_email = user_email_param
        ), 0.0) as total_earnings,
        
        COALESCE((
            SELECT SUM(commission_amount)
            FROM referral_commissions 
            WHERE earner_email = user_email_param 
            AND calculation_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0.0) as monthly_earnings,
        
        LEAST(COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM referral_relationships 
            WHERE referrer_email = user_email_param AND is_active = true
        ), 0) + 1, 15) as current_level;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral relationship when user signs up
CREATE OR REPLACE FUNCTION create_referral_relationship(
    referrer_code VARCHAR(50),
    new_user_email VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    referrer_email_var VARCHAR(255);
    max_depth INTEGER := 15;
    current_depth INTEGER := 1;
BEGIN
    -- Find the referrer by code
    SELECT user_email INTO referrer_email_var
    FROM user_referral_codes
    WHERE referral_code = referrer_code;

    IF referrer_email_var IS NULL THEN
        RETURN FALSE; -- Invalid referral code
    END IF;

    -- Create direct referral relationship (level 1)
    INSERT INTO referral_relationships (
        referrer_email,
        referred_email,
        referral_code,
        level_depth,
        created_at,
        is_active
    ) VALUES (
        referrer_email_var,
        new_user_email,
        referrer_code,
        1,
        NOW(),
        true
    );

    -- Create multi-level relationships (up to 15 levels)
    WHILE current_depth < max_depth LOOP
        -- Find the next level referrer
        SELECT referrer_email INTO referrer_email_var
        FROM referral_relationships
        WHERE referred_email = referrer_email_var
        AND level_depth = 1
        AND is_active = true
        LIMIT 1;

        EXIT WHEN referrer_email_var IS NULL;

        current_depth := current_depth + 1;

        -- Insert the multi-level relationship
        INSERT INTO referral_relationships (
            referrer_email,
            referred_email,
            referral_code,
            level_depth,
            created_at,
            is_active
        ) VALUES (
            referrer_email_var,
            new_user_email,
            referrer_code,
            current_depth,
            NOW(),
            true
        );
    END LOOP;

    -- Update referrer's total referrals count
    UPDATE user_referral_codes 
    SET total_referrals = total_referrals + 1,
        updated_at = NOW()
    WHERE user_email = (
        SELECT referrer_email 
        FROM referral_relationships 
        WHERE referred_email = new_user_email 
        AND level_depth = 1 
        LIMIT 1
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
