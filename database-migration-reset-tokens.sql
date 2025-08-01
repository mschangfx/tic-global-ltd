-- Database Migration: Add Password Reset Token Fields
-- Run this SQL in your Supabase SQL Editor

-- Add reset token fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Add password field if it doesn't exist (for users who register with email/password)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Update the updated_at column to have a default value
ALTER TABLE users 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Clean up expired reset tokens (run this periodically)
-- DELETE FROM users 
-- WHERE reset_token IS NOT NULL 
-- AND reset_token_expiry < NOW();

COMMENT ON COLUMN users.reset_token IS 'Token for password reset functionality';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiry timestamp for reset token';
COMMENT ON COLUMN users.password IS 'Hashed password for email/password authentication';
