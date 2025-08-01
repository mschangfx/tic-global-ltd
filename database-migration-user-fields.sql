-- Database Migration: Add Country and Referral ID Fields
-- Run this SQL in your Supabase SQL Editor

-- Add country and referral_id fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country VARCHAR(2),
ADD COLUMN IF NOT EXISTS referral_id VARCHAR(255);

-- Create index for faster referral_id lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_id ON users(referral_id) WHERE referral_id IS NOT NULL;

-- Create index for country lookups
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country) WHERE country IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.country IS 'ISO 3166-1 alpha-2 country code (e.g., PH, SG, MY)';
COMMENT ON COLUMN users.referral_id IS 'Referral ID used during registration';

-- Optional: Create a referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Create indexes for referrals table
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Enable RLS for referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Create policies for referrals table
CREATE POLICY "Users can view their referrals" ON referrals
  FOR SELECT USING (
    auth.uid()::text = referrer_id::text OR 
    auth.uid()::text = referred_id::text
  );

-- Create policy to allow inserting referrals during registration
CREATE POLICY "Allow referral creation" ON referrals
  FOR INSERT WITH CHECK (true);

-- Add comments for referrals table
COMMENT ON TABLE referrals IS 'Tracks referral relationships between users';
COMMENT ON COLUMN referrals.referrer_id IS 'User who made the referral';
COMMENT ON COLUMN referrals.referred_id IS 'User who was referred';
COMMENT ON COLUMN referrals.referral_code IS 'The referral code used';

-- Create a function to validate referral codes
CREATE OR REPLACE FUNCTION validate_referral_code(code VARCHAR(255))
RETURNS UUID AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Try to find a user with this referral code
  -- This assumes you have a way to identify referrers by their code
  -- You might need to adjust this based on your referral system
  SELECT id INTO referrer_user_id
  FROM users
  WHERE referral_id = code OR email = code OR id::text = code
  LIMIT 1;

  RETURN referrer_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger function to automatically create referral relationships
CREATE OR REPLACE FUNCTION create_referral_relationship()
RETURNS TRIGGER AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Only process if referral_id is provided
  IF NEW.referral_id IS NOT NULL AND NEW.referral_id != '' THEN
    -- Find the referrer
    SELECT validate_referral_code(NEW.referral_id) INTO referrer_user_id;
    
    -- If referrer found and it's not the same user, create referral relationship
    IF referrer_user_id IS NOT NULL AND referrer_user_id != NEW.id THEN
      INSERT INTO referrals (referrer_id, referred_id, referral_code)
      VALUES (referrer_user_id, NEW.id, NEW.referral_id)
      ON CONFLICT (referred_id) DO NOTHING; -- Prevent duplicate referrals
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create referral relationships
DROP TRIGGER IF EXISTS create_referral_on_user_insert ON users;
CREATE TRIGGER create_referral_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_relationship();

-- Create a view for easy referral statistics
CREATE OR REPLACE VIEW user_referral_stats AS
SELECT 
  u.id,
  u.email,
  u.referral_id,
  COUNT(r.referred_id) as total_referrals,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as referrals_last_30_days,
  COUNT(CASE WHEN r.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as referrals_last_7_days
FROM users u
LEFT JOIN referrals r ON u.id = r.referrer_id
GROUP BY u.id, u.email, u.referral_id;

-- Add comment for the view
COMMENT ON VIEW user_referral_stats IS 'Provides referral statistics for each user';

-- ========================================
-- EMAIL VERIFICATION SYSTEM
-- ========================================

-- Create email_verifications table for storing verification codes
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT email_verifications_email_key UNIQUE (email)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Add email_verified columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Add phone verification columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Add profile completion columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create indexes for verification columns
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;

-- ========================================
-- PHONE VERIFICATION SYSTEM
-- ========================================

-- Create phone_verifications table for storing verification codes
CREATE TABLE IF NOT EXISTS phone_verifications (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT phone_verifications_phone_key UNIQUE (phone_number)
);

-- Add indexes for phone verifications
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON phone_verifications(code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Add comments for email verification
COMMENT ON TABLE email_verifications IS 'Stores email verification codes for user email confirmation';
COMMENT ON COLUMN email_verifications.email IS 'User email address to be verified';
COMMENT ON COLUMN email_verifications.code IS '6-digit verification code';
COMMENT ON COLUMN email_verifications.expires_at IS 'When the verification code expires';
COMMENT ON COLUMN email_verifications.created_at IS 'When the verification code was created';
COMMENT ON COLUMN users.email_verified IS 'Whether the user email has been verified';
COMMENT ON COLUMN users.email_verified_at IS 'When the user email was verified';

-- Add comments for phone verification
COMMENT ON TABLE phone_verifications IS 'Stores phone verification codes for user phone confirmation';
COMMENT ON COLUMN phone_verifications.phone_number IS 'User phone number to be verified';
COMMENT ON COLUMN phone_verifications.code IS '6-digit verification code';
COMMENT ON COLUMN phone_verifications.expires_at IS 'When the verification code expires';
COMMENT ON COLUMN phone_verifications.created_at IS 'When the verification code was created';
COMMENT ON COLUMN users.phone_number IS 'User phone number';
COMMENT ON COLUMN users.phone_verified IS 'Whether the user phone has been verified';
COMMENT ON COLUMN users.phone_verified_at IS 'When the user phone was verified';
COMMENT ON COLUMN users.profile_completed IS 'Whether the user profile has been completed';
COMMENT ON COLUMN users.profile_completed_at IS 'When the user profile was completed';
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.date_of_birth IS 'User date of birth';
COMMENT ON COLUMN users.address IS 'User address';
