-- Database schema for referrals list functionality
-- This extends the existing referral system with detailed user tracking

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100),
    referral_code VARCHAR(50) UNIQUE,
    referred_by_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE
);

-- Create user_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('starter', 'vip')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'cancelled')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    auto_renewal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_email) REFERENCES user_profiles(email) ON DELETE CASCADE
);

-- Create referral_relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_email VARCHAR(255) NOT NULL,
    referred_email VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    referral_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (referrer_email) REFERENCES user_profiles(email) ON DELETE CASCADE,
    FOREIGN KEY (referred_email) REFERENCES user_profiles(email) ON DELETE CASCADE,
    UNIQUE(referrer_email, referred_email)
);

-- Create referral_commissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    from_user_email VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_type VARCHAR(50) NOT NULL DEFAULT 'referral' CHECK (commission_type IN ('referral', 'bonus', 'rank')),
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_email) REFERENCES user_profiles(email) ON DELETE CASCADE,
    FOREIGN KEY (from_user_email) REFERENCES user_profiles(email) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer ON referral_relationships(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred ON referral_relationships(referred_email);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_level ON referral_relationships(level);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_user ON referral_commissions(user_email);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_from_user ON referral_commissions(from_user_email);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_created ON referral_commissions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_plans_email ON user_plans(user_email);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);

-- Function to get all referrals for a user with detailed information
CREATE OR REPLACE FUNCTION get_user_referrals(p_user_email VARCHAR)
RETURNS TABLE (
    referral_id UUID,
    referred_email VARCHAR,
    referred_name VARCHAR,
    referral_level INTEGER,
    join_date TIMESTAMP WITH TIME ZONE,
    plan_type VARCHAR,
    plan_status VARCHAR,
    last_active TIMESTAMP WITH TIME ZONE,
    total_earnings DECIMAL,
    monthly_earnings DECIMAL,
    referrals_count BIGINT,
    referral_code VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.id as referral_id,
        rr.referred_email,
        COALESCE(up.full_name, split_part(rr.referred_email, '@', 1)) as referred_name,
        rr.level as referral_level,
        rr.created_at as join_date,
        COALESCE(upl.plan_type, 'starter') as plan_type,
        COALESCE(upl.status, 'pending') as plan_status,
        COALESCE(up.last_active, rr.created_at) as last_active,
        COALESCE(earnings.total_earnings, 0) as total_earnings,
        COALESCE(earnings.monthly_earnings, 0) as monthly_earnings,
        COALESCE(ref_count.referrals_count, 0) as referrals_count,
        COALESCE(rr.referral_code, '') as referral_code
    FROM referral_relationships rr
    LEFT JOIN user_profiles up ON rr.referred_email = up.email
    LEFT JOIN user_plans upl ON rr.referred_email = upl.user_email
    LEFT JOIN (
        SELECT 
            from_user_email,
            SUM(amount) as total_earnings,
            SUM(CASE 
                WHEN created_at >= NOW() - INTERVAL '30 days' 
                THEN amount 
                ELSE 0 
            END) as monthly_earnings
        FROM referral_commissions 
        WHERE status = 'completed'
        GROUP BY from_user_email
    ) earnings ON rr.referred_email = earnings.from_user_email
    LEFT JOIN (
        SELECT 
            referrer_email,
            COUNT(*) as referrals_count
        FROM referral_relationships 
        WHERE is_active = true
        GROUP BY referrer_email
    ) ref_count ON rr.referred_email = ref_count.referrer_email
    WHERE rr.referrer_email = p_user_email
    AND rr.is_active = true
    ORDER BY rr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get referral statistics for a user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_email VARCHAR)
RETURNS TABLE (
    total_referrals BIGINT,
    active_referrals BIGINT,
    pending_referrals BIGINT,
    inactive_referrals BIGINT,
    total_earnings DECIMAL,
    monthly_earnings DECIMAL,
    level_breakdown JSONB,
    plan_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN upl.status = 'active' AND up.last_active >= NOW() - INTERVAL '7 days' THEN 1 END) as active_referrals,
        COUNT(CASE WHEN COALESCE(upl.status, 'pending') = 'pending' THEN 1 END) as pending_referrals,
        COUNT(CASE WHEN upl.status = 'active' AND up.last_active < NOW() - INTERVAL '7 days' THEN 1 END) as inactive_referrals,
        COALESCE(SUM(earnings.total_earnings), 0) as total_earnings,
        COALESCE(SUM(earnings.monthly_earnings), 0) as monthly_earnings,
        jsonb_agg(DISTINCT jsonb_build_object('level', rr.level, 'count', level_counts.level_count)) as level_breakdown,
        jsonb_agg(DISTINCT jsonb_build_object('planType', COALESCE(upl.plan_type, 'starter'), 'count', plan_counts.plan_count)) as plan_breakdown
    FROM referral_relationships rr
    LEFT JOIN user_profiles up ON rr.referred_email = up.email
    LEFT JOIN user_plans upl ON rr.referred_email = upl.user_email
    LEFT JOIN (
        SELECT 
            from_user_email,
            SUM(amount) as total_earnings,
            SUM(CASE 
                WHEN created_at >= NOW() - INTERVAL '30 days' 
                THEN amount 
                ELSE 0 
            END) as monthly_earnings
        FROM referral_commissions 
        WHERE status = 'completed'
        GROUP BY from_user_email
    ) earnings ON rr.referred_email = earnings.from_user_email
    LEFT JOIN (
        SELECT 
            level,
            COUNT(*) as level_count
        FROM referral_relationships 
        WHERE referrer_email = p_user_email AND is_active = true
        GROUP BY level
    ) level_counts ON rr.level = level_counts.level
    LEFT JOIN (
        SELECT 
            COALESCE(upl2.plan_type, 'starter') as plan_type,
            COUNT(*) as plan_count
        FROM referral_relationships rr2
        LEFT JOIN user_plans upl2 ON rr2.referred_email = upl2.user_email
        WHERE rr2.referrer_email = p_user_email AND rr2.is_active = true
        GROUP BY COALESCE(upl2.plan_type, 'starter')
    ) plan_counts ON COALESCE(upl.plan_type, 'starter') = plan_counts.plan_type
    WHERE rr.referrer_email = p_user_email
    AND rr.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to search referrals with filters
CREATE OR REPLACE FUNCTION search_user_referrals(
    p_user_email VARCHAR,
    p_search_term VARCHAR DEFAULT '',
    p_level INTEGER DEFAULT NULL,
    p_plan_type VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    referral_id UUID,
    referred_email VARCHAR,
    referred_name VARCHAR,
    referral_level INTEGER,
    join_date TIMESTAMP WITH TIME ZONE,
    plan_type VARCHAR,
    plan_status VARCHAR,
    last_active TIMESTAMP WITH TIME ZONE,
    total_earnings DECIMAL,
    monthly_earnings DECIMAL,
    referrals_count BIGINT,
    referral_code VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_user_referrals(p_user_email)
    WHERE 
        (p_search_term = '' OR 
         LOWER(referred_name) LIKE LOWER('%' || p_search_term || '%') OR
         LOWER(referred_email) LIKE LOWER('%' || p_search_term || '%') OR
         LOWER(referral_code) LIKE LOWER('%' || p_search_term || '%'))
    AND (p_level IS NULL OR referral_level = p_level)
    AND (p_plan_type IS NULL OR plan_type = p_plan_type)
    AND (p_status IS NULL OR 
         (p_status = 'active' AND plan_status = 'active' AND last_active >= NOW() - INTERVAL '7 days') OR
         (p_status = 'pending' AND plan_status = 'pending') OR
         (p_status = 'inactive' AND plan_status = 'active' AND last_active < NOW() - INTERVAL '7 days'))
    ORDER BY join_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
DROP TRIGGER IF EXISTS trigger_update_last_active ON user_profiles;
CREATE TRIGGER trigger_update_last_active
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.email() = email);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.email() = email);

CREATE POLICY "Users can view their own plans" ON user_plans
    FOR SELECT USING (auth.email() = user_email);

CREATE POLICY "Users can view their referral relationships" ON referral_relationships
    FOR SELECT USING (auth.email() = referrer_email OR auth.email() = referred_email);

CREATE POLICY "Users can view their commissions" ON referral_commissions
    FOR SELECT USING (auth.email() = user_email OR auth.email() = from_user_email);

-- Insert sample data for testing (optional)
INSERT INTO user_profiles (email, full_name, referral_code, created_at, last_active) VALUES
('demo@example.com', 'Demo User', 'DEMO123', NOW(), NOW()),
('john.doe@example.com', 'John Doe', 'JOHN123', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
('jane.smith@example.com', 'Jane Smith', 'JANE456', NOW() - INTERVAL '5 days', NOW()),
('mike.wilson@example.com', 'Mike Wilson', 'MIKE789', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
('sarah.jones@example.com', 'Sarah Jones', 'SARAH101', NOW() - INTERVAL '7 days', NOW()),
('david.brown@example.com', 'David Brown', 'DAVID202', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
('lisa.garcia@example.com', 'Lisa Garcia', 'LISA303', NOW() - INTERVAL '2 days', NOW()),
('robert.taylor@example.com', 'Robert Taylor', 'ROBERT404', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('emma.davis@example.com', 'Emma Davis', 'EMMA505', NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample referral relationships
INSERT INTO referral_relationships (referrer_email, referred_email, level, referral_code, created_at) VALUES
('demo@example.com', 'john.doe@example.com', 1, 'JOHN123', NOW() - INTERVAL '6 days'),
('demo@example.com', 'jane.smith@example.com', 1, 'JANE456', NOW() - INTERVAL '5 days'),
('demo@example.com', 'mike.wilson@example.com', 1, 'MIKE789', NOW() - INTERVAL '3 days'),
('john.doe@example.com', 'sarah.jones@example.com', 2, 'SARAH101', NOW() - INTERVAL '7 days'),
('john.doe@example.com', 'david.brown@example.com', 2, 'DAVID202', NOW() - INTERVAL '4 days'),
('jane.smith@example.com', 'lisa.garcia@example.com', 2, 'LISA303', NOW() - INTERVAL '2 days'),
('sarah.jones@example.com', 'robert.taylor@example.com', 3, 'ROBERT404', NOW() - INTERVAL '1 day'),
('david.brown@example.com', 'emma.davis@example.com', 3, 'EMMA505', NOW() - INTERVAL '3 days')
ON CONFLICT (referrer_email, referred_email) DO NOTHING;

-- Insert sample user plans
INSERT INTO user_plans (user_email, plan_type, status, amount, purchase_date) VALUES
('john.doe@example.com', 'vip', 'active', 138.00, NOW() - INTERVAL '6 days'),
('jane.smith@example.com', 'vip', 'active', 138.00, NOW() - INTERVAL '5 days'),
('mike.wilson@example.com', 'starter', 'pending', 0.00, NOW() - INTERVAL '3 days'),
('sarah.jones@example.com', 'vip', 'active', 138.00, NOW() - INTERVAL '7 days'),
('david.brown@example.com', 'vip', 'active', 138.00, NOW() - INTERVAL '4 days'),
('lisa.garcia@example.com', 'vip', 'active', 138.00, NOW() - INTERVAL '2 days'),
('robert.taylor@example.com', 'starter', 'pending', 0.00, NOW() - INTERVAL '1 day'),
('emma.davis@example.com', 'vip', 'active', 138.00, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Insert sample commissions
INSERT INTO referral_commissions (user_email, from_user_email, level, amount, commission_type, plan_type, status, created_at) VALUES
('demo@example.com', 'john.doe@example.com', 1, 13.80, 'referral', 'vip', 'completed', NOW() - INTERVAL '6 days'),
('demo@example.com', 'jane.smith@example.com', 1, 13.80, 'referral', 'vip', 'completed', NOW() - INTERVAL '5 days'),
('demo@example.com', 'sarah.jones@example.com', 2, 6.90, 'referral', 'vip', 'completed', NOW() - INTERVAL '7 days'),
('demo@example.com', 'david.brown@example.com', 2, 6.90, 'referral', 'vip', 'completed', NOW() - INTERVAL '4 days'),
('demo@example.com', 'lisa.garcia@example.com', 2, 6.90, 'referral', 'vip', 'completed', NOW() - INTERVAL '2 days'),
('demo@example.com', 'emma.davis@example.com', 3, 3.45, 'referral', 'vip', 'completed', NOW() - INTERVAL '3 days'),
('john.doe@example.com', 'sarah.jones@example.com', 1, 13.80, 'referral', 'vip', 'completed', NOW() - INTERVAL '7 days'),
('john.doe@example.com', 'david.brown@example.com', 1, 13.80, 'referral', 'vip', 'completed', NOW() - INTERVAL '4 days'),
('jane.smith@example.com', 'lisa.garcia@example.com', 1, 13.80, 'referral', 'vip', 'completed', NOW() - INTERVAL '2 days'),
('david.brown@example.com', 'emma.davis@example.com', 1, 13.80, 'referral', 'vip', 'completed', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
