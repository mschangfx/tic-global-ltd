-- Database Migration: Add Identity Verification Fields
-- Run this SQL in your Supabase SQL Editor

-- Add identity verification fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS identity_verification_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS identity_verification_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS identity_full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS identity_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS identity_verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS identity_documents_uploaded BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_identity_verification_status ON users(identity_verification_status) WHERE identity_verification_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_identity_verification_submitted ON users(identity_verification_submitted) WHERE identity_verification_submitted = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN users.identity_verification_submitted IS 'Whether user has submitted identity verification';
COMMENT ON COLUMN users.identity_verification_submitted_at IS 'When identity verification was submitted';
COMMENT ON COLUMN users.identity_full_name IS 'Full name as provided for identity verification';
COMMENT ON COLUMN users.identity_country IS 'Country for identity verification';
COMMENT ON COLUMN users.identity_verification_status IS 'Status: pending, approved, rejected';
COMMENT ON COLUMN users.identity_verified_at IS 'When identity was verified';
COMMENT ON COLUMN users.identity_documents_uploaded IS 'Whether documents have been uploaded';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'identity_%'
ORDER BY column_name;
