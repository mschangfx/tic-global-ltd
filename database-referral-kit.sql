-- Referral Kit Database Schema
-- This schema supports the complete referral kit functionality including
-- referral code generation, link creation, and multi-level referral tracking

-- =====================================================
-- USER PROFILES TABLE (Enhanced for Referral Kit)
-- =====================================================

-- Add referral-related columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS referral_link TEXT,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS monthly_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by_email);

-- =====================================================
-- REFERRAL RELATIONSHIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_email VARCHAR(255) NOT NULL,
    referred_email VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 15),
    referral_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Foreign key constraints
    FOREIGN KEY (referrer_email) REFERENCES user_profiles(email) ON DELETE CASCADE,
    FOREIGN KEY (referred_email) REFERENCES user_profiles(email) ON DELETE CASCADE,
    
    -- Ensure unique relationship per level
    UNIQUE(referrer_email, referred_email, level)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer ON referral_relationships(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred ON referral_relationships(referred_email);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_level ON referral_relationships(level);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_code ON referral_relationships(referral_code);

-- =====================================================
-- REFERRAL COMMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    from_user_email VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 15),
    amount DECIMAL(10,2) NOT NULL,
    commission_type VARCHAR(50) DEFAULT 'referral', -- 'referral', 'bonus', 'daily'
    plan_type VARCHAR(50), -- 'starter', 'vip'
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_email) REFERENCES user_profiles(email) ON DELETE CASCADE,
    FOREIGN KEY (from_user_email) REFERENCES user_profiles(email) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_user ON referral_commissions(user_email);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_from_user ON referral_commissions(from_user_email);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_level ON referral_commissions(level);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_created_at ON referral_commissions(created_at);

-- =====================================================
-- REFERRAL STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW referral_statistics AS
SELECT 
    up.email,
    up.referral_code,
    up.referral_link,
    COALESCE(stats.total_referrals, 0) as total_referrals,
    COALESCE(stats.active_referrals, 0) as active_referrals,
    COALESCE(stats.pending_referrals, 0) as pending_referrals,
    COALESCE(stats.inactive_referrals, 0) as inactive_referrals,
    COALESCE(earnings.total_earnings, 0) as total_earnings,
    COALESCE(earnings.monthly_earnings, 0) as monthly_earnings,
    up.created_at as user_created_at,
    up.last_active
FROM user_profiles up
LEFT JOIN (
    -- Referral counts by status
    SELECT 
        rr.referrer_email,
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN rr.is_active = true AND up.last_active >= NOW() - INTERVAL '7 days' THEN 1 END) as active_referrals,
        COUNT(CASE WHEN up.verification_status = 'pending' THEN 1 END) as pending_referrals,
        COUNT(CASE WHEN rr.is_active = false OR up.last_active < NOW() - INTERVAL '7 days' THEN 1 END) as inactive_referrals
    FROM referral_relationships rr
    LEFT JOIN user_profiles up ON rr.referred_email = up.email
    WHERE rr.level = 1  -- Only direct referrals for main stats
    GROUP BY rr.referrer_email
) stats ON up.email = stats.referrer_email
LEFT JOIN (
    -- Earnings calculations
    SELECT 
        rc.user_email,
        SUM(rc.amount) as total_earnings,
        SUM(CASE WHEN rc.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN rc.amount ELSE 0 END) as monthly_earnings
    FROM referral_commissions rc
    WHERE rc.status = 'completed'
    GROUP BY rc.user_email
) earnings ON up.email = earnings.user_email;

-- =====================================================
-- REFERRAL CODE GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_unique_referral_code(user_email VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    base_code VARCHAR;
    final_code VARCHAR;
    counter INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    -- Extract username from email and create base code
    base_code := UPPER(SUBSTRING(SPLIT_PART(user_email, '@', 1) FROM 1 FOR 4));
    
    -- Try to generate unique code
    WHILE counter < max_attempts LOOP
        final_code := base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = final_code) THEN
            RETURN final_code;
        END IF;
        
        counter := counter + 1;
    END LOOP;
    
    -- If all attempts failed, use timestamp-based code
    RETURN base_code || TO_CHAR(EXTRACT(EPOCH FROM NOW())::INTEGER, 'FM999999');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REFERRAL PROCESSING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION process_referral_registration(
    referral_code_param VARCHAR,
    new_user_email VARCHAR
)
RETURNS JSON AS $$
DECLARE
    referrer_email VARCHAR;
    current_referrer VARCHAR;
    current_level INTEGER := 1;
    result JSON;
BEGIN
    -- Find referrer by code
    SELECT email INTO referrer_email 
    FROM user_profiles 
    WHERE referral_code = referral_code_param;
    
    IF referrer_email IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Invalid referral code');
    END IF;
    
    -- Check if user already has a referrer
    IF EXISTS (SELECT 1 FROM user_profiles WHERE email = new_user_email AND referred_by_email IS NOT NULL) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'message', 'User already has a referrer');
    END IF;
    
    -- Update new user's profile
    UPDATE user_profiles 
    SET referred_by_email = referrer_email, updated_at = CURRENT_TIMESTAMP
    WHERE email = new_user_email;
    
    -- Build referral chain (up to 15 levels)
    current_referrer := referrer_email;
    
    WHILE current_referrer IS NOT NULL AND current_level <= 15 LOOP
        -- Insert referral relationship
        INSERT INTO referral_relationships (
            referrer_email, 
            referred_email, 
            level, 
            referral_code,
            created_at,
            is_active
        ) VALUES (
            current_referrer, 
            new_user_email, 
            current_level, 
            CASE WHEN current_level = 1 THEN referral_code_param ELSE NULL END,
            CURRENT_TIMESTAMP,
            true
        );
        
        -- Find next level referrer
        SELECT referred_by_email INTO current_referrer 
        FROM user_profiles 
        WHERE email = current_referrer;
        
        current_level := current_level + 1;
    END LOOP;
    
    -- Update referrer statistics
    UPDATE user_profiles 
    SET 
        total_referrals = total_referrals + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE email = referrer_email;
    
    RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Referral processed successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Error processing referral: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMISSION CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_referral_commission(
    user_email_param VARCHAR,
    plan_type_param VARCHAR,
    plan_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
    commission_rates DECIMAL[] := ARRAY[10.0, 5.0, 5.0, 5.0, 5.0, 5.0, 2.5, 2.5, 2.5, 2.5, 1.0, 1.0, 1.0, 1.0, 1.0];
    referrer_record RECORD;
    commission_amount DECIMAL;
    level_counter INTEGER := 1;
    result JSON;
BEGIN
    -- Process commissions for each level
    FOR referrer_record IN 
        SELECT rr.referrer_email, rr.level
        FROM referral_relationships rr
        WHERE rr.referred_email = user_email_param 
        AND rr.is_active = true
        ORDER BY rr.level
    LOOP
        -- Calculate commission for this level
        commission_amount := (plan_amount * commission_rates[referrer_record.level]) / 100.0;
        
        -- Insert commission record
        INSERT INTO referral_commissions (
            user_email,
            from_user_email,
            level,
            amount,
            commission_type,
            plan_type,
            status,
            created_at
        ) VALUES (
            referrer_record.referrer_email,
            user_email_param,
            referrer_record.level,
            commission_amount,
            'referral',
            plan_type_param,
            'pending',
            CURRENT_TIMESTAMP
        );
        
        level_counter := level_counter + 1;
    END LOOP;
    
    RETURN JSON_BUILD_OBJECT('success', true, 'levels_processed', level_counter - 1);
    
EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'message', 'Error calculating commission: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample referral codes for existing users
UPDATE user_profiles 
SET referral_code = generate_unique_referral_code(email),
    referral_link = 'https://ticgloballtd.com/join?ref=' || generate_unique_referral_code(email)
WHERE referral_code IS NULL;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update user statistics when referral relationships change
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update referrer's total referrals count
    UPDATE user_profiles 
    SET 
        total_referrals = (
            SELECT COUNT(*) 
            FROM referral_relationships 
            WHERE referrer_email = NEW.referrer_email 
            AND level = 1 
            AND is_active = true
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE email = NEW.referrer_email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_stats
    AFTER INSERT OR UPDATE ON referral_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

-- Trigger to update earnings when commissions are processed
CREATE OR REPLACE FUNCTION update_earnings_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE user_profiles 
        SET 
            total_earnings = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM referral_commissions 
                WHERE user_email = NEW.user_email 
                AND status = 'completed'
            ),
            monthly_earnings = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM referral_commissions 
                WHERE user_email = NEW.user_email 
                AND status = 'completed'
                AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE email = NEW.user_email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_earnings_stats
    AFTER UPDATE ON referral_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_earnings_stats();
