-- Database Migration: Add Referral System Columns
-- Run this SQL in your Supabase SQL Editor

-- Add referral_code column to users table (unique referral code for each user)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- Add referral_id column to users table (stores who referred this user)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_id VARCHAR(20);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referral_id ON users(referral_id);

-- Add comments for documentation
COMMENT ON COLUMN users.referral_code IS 'Unique referral code generated for this user to share with others';
COMMENT ON COLUMN users.referral_id IS 'Referral code of the user who referred this user';

-- Create referral_earnings table to track earnings from referrals
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    referred_user_email VARCHAR(255) NOT NULL,
    referral_code VARCHAR(20) NOT NULL,
    earning_type VARCHAR(50) NOT NULL, -- 'direct_bonus', 'community_bonus', 'passive_bonus', 'rank_bonus'
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    package_type VARCHAR(50), -- 'starter', 'vip', etc.
    level_depth INTEGER DEFAULT 1, -- For community bonus tracking (1-15 levels)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_referral_earnings_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    CONSTRAINT fk_referral_earnings_referred_user_email FOREIGN KEY (referred_user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Add indexes for referral_earnings table
CREATE INDEX IF NOT EXISTS idx_referral_earnings_user_email ON referral_earnings(user_email);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred_user_email ON referral_earnings(referred_user_email);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_code ON referral_earnings(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_earning_type ON referral_earnings(earning_type);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_transaction_date ON referral_earnings(transaction_date);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status);

-- Add comments for referral_earnings table
COMMENT ON TABLE referral_earnings IS 'Tracks all earnings from referral activities';
COMMENT ON COLUMN referral_earnings.user_email IS 'Email of the user earning the referral bonus';
COMMENT ON COLUMN referral_earnings.referred_user_email IS 'Email of the user who was referred';
COMMENT ON COLUMN referral_earnings.referral_code IS 'Referral code used for this earning';
COMMENT ON COLUMN referral_earnings.earning_type IS 'Type of referral earning (direct, community, passive, rank)';
COMMENT ON COLUMN referral_earnings.amount IS 'Amount earned in the specified currency';
COMMENT ON COLUMN referral_earnings.package_type IS 'Package purchased by referred user (if applicable)';
COMMENT ON COLUMN referral_earnings.level_depth IS 'Depth level for community bonus (1-15)';

-- Create referral_stats view for easy analytics
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    u.email,
    u.referral_code,
    COUNT(DISTINCT r.email) as total_referrals,
    COUNT(DISTINCT CASE WHEN r.email_verified = true THEN r.email END) as active_referrals,
    COALESCE(SUM(re.amount), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN re.transaction_date >= date_trunc('month', CURRENT_DATE) THEN re.amount ELSE 0 END), 0) as monthly_earnings,
    COALESCE(SUM(CASE WHEN re.earning_type = 'direct_bonus' THEN re.amount ELSE 0 END), 0) as direct_earnings,
    COALESCE(SUM(CASE WHEN re.earning_type = 'community_bonus' THEN re.amount ELSE 0 END), 0) as community_earnings,
    COALESCE(SUM(CASE WHEN re.earning_type = 'passive_bonus' THEN re.amount ELSE 0 END), 0) as passive_earnings,
    COALESCE(SUM(CASE WHEN re.earning_type = 'rank_bonus' THEN re.amount ELSE 0 END), 0) as rank_earnings
FROM users u
LEFT JOIN users r ON r.referral_id = u.referral_code
LEFT JOIN referral_earnings re ON re.user_email = u.email AND re.status = 'paid'
GROUP BY u.email, u.referral_code;

-- Add comment for the view
COMMENT ON VIEW referral_stats IS 'Aggregated referral statistics for each user';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_referral_earnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_referral_earnings_updated_at ON referral_earnings;
CREATE TRIGGER trigger_update_referral_earnings_updated_at
    BEFORE UPDATE ON referral_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_earnings_updated_at();

-- Function to calculate and award referral bonuses
CREATE OR REPLACE FUNCTION award_referral_bonus(
    referred_user_email VARCHAR(255),
    package_type VARCHAR(50) DEFAULT 'starter',
    package_amount DECIMAL(10, 2) DEFAULT 138.00
)
RETURNS VOID AS $$
DECLARE
    referrer_code VARCHAR(20);
    referrer_email VARCHAR(255);
    direct_bonus_rate DECIMAL(5, 4);
BEGIN
    -- Get the referrer information
    SELECT referral_id INTO referrer_code
    FROM users 
    WHERE email = referred_user_email;
    
    IF referrer_code IS NOT NULL THEN
        -- Get referrer email
        SELECT email INTO referrer_email
        FROM users 
        WHERE referral_code = referrer_code;
        
        IF referrer_email IS NOT NULL THEN
            -- Calculate direct bonus rate
            direct_bonus_rate := CASE 
                WHEN package_type = 'starter' THEN 0.05  -- 5%
                WHEN package_type = 'vip' THEN 0.10      -- 10%
                ELSE 0.05
            END;
            
            -- Award direct bonus
            INSERT INTO referral_earnings (
                user_email,
                referred_user_email,
                referral_code,
                earning_type,
                amount,
                package_type,
                level_depth,
                status
            ) VALUES (
                referrer_email,
                referred_user_email,
                referrer_code,
                'direct_bonus',
                package_amount * direct_bonus_rate,
                package_type,
                1,
                'paid'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION award_referral_bonus IS 'Calculates and awards referral bonuses when a referred user makes a purchase';

-- Test the setup (optional - you can run these to verify everything works)
-- SELECT 'Referral system tables created successfully' as status;
-- SELECT * FROM referral_stats LIMIT 5;
