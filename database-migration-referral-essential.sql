-- Essential Referral System Migration
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add referral columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_id VARCHAR(20);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referral_id ON users(referral_id);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN users.referral_code IS 'Unique referral code generated for this user to share with others';
COMMENT ON COLUMN users.referral_id IS 'Referral code of the user who referred this user';

-- Step 4: Create referral_earnings table for tracking earnings
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    referred_user_email VARCHAR(255) NOT NULL,
    referral_code VARCHAR(20) NOT NULL,
    earning_type VARCHAR(50) NOT NULL DEFAULT 'direct_bonus',
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    package_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_referral_earnings_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    CONSTRAINT fk_referral_earnings_referred_user_email FOREIGN KEY (referred_user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Step 5: Add indexes for referral_earnings table
CREATE INDEX IF NOT EXISTS idx_referral_earnings_user_email ON referral_earnings(user_email);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred_user_email ON referral_earnings(referred_user_email);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_code ON referral_earnings(referral_code);

-- Step 6: Test the setup
SELECT 'Referral system setup completed successfully!' as status;

-- Step 7: Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('referral_code', 'referral_id');

-- Step 8: Verify referral_earnings table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'referral_earnings';
