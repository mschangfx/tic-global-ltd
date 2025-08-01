-- Database Migration: Add Enhanced Profile Fields
-- Run this SQL in your Supabase SQL Editor

-- Add new profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country_of_birth VARCHAR(100),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_country_of_birth ON users(country_of_birth) WHERE country_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender) WHERE gender IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.country_of_birth IS 'Country where the user was born';
COMMENT ON COLUMN users.gender IS 'User gender (Female, Male, Other)';

-- Update existing records to have default values if needed
UPDATE users 
SET country_of_birth = 'Philippines' 
WHERE country_of_birth IS NULL AND country = 'PH';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('country_of_birth', 'gender', 'first_name', 'last_name', 'date_of_birth', 'address')
ORDER BY column_name;
