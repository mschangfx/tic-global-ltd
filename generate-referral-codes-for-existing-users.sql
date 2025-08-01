-- Generate Referral Codes for Existing Users
-- Run this AFTER running the essential migration

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code_for_user(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    email_part TEXT;
    random_part TEXT;
    timestamp_part TEXT;
    referral_code TEXT;
BEGIN
    -- Extract first 4 characters from email (before @)
    email_part := UPPER(SUBSTRING(SPLIT_PART(user_email, '@', 1) FROM 1 FOR 4));
    
    -- Generate random 4 character string
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Get last 4 digits of current timestamp
    timestamp_part := RIGHT(EXTRACT(EPOCH FROM NOW())::TEXT, 4);
    
    -- Combine parts
    referral_code := email_part || random_part || timestamp_part;
    
    RETURN referral_code;
END;
$$ LANGUAGE plpgsql;

-- Update all existing users without referral codes
UPDATE users 
SET referral_code = generate_referral_code_for_user(email),
    updated_at = NOW()
WHERE referral_code IS NULL;

-- Verify the update
SELECT 
    email, 
    referral_code,
    CASE 
        WHEN referral_code IS NOT NULL THEN 'Generated'
        ELSE 'Missing'
    END as status
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- Clean up the function (optional)
-- DROP FUNCTION IF EXISTS generate_referral_code_for_user(TEXT);
