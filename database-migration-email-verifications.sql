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

-- Create index for email_verified column
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Clean up expired verification codes (optional - can be run periodically)
-- DELETE FROM email_verifications WHERE expires_at < NOW();

COMMENT ON TABLE email_verifications IS 'Stores email verification codes for user email confirmation';
COMMENT ON COLUMN email_verifications.email IS 'User email address to be verified';
COMMENT ON COLUMN email_verifications.code IS '6-digit verification code';
COMMENT ON COLUMN email_verifications.expires_at IS 'When the verification code expires';
COMMENT ON COLUMN email_verifications.created_at IS 'When the verification code was created';
