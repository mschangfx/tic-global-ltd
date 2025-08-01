-- Database Migration: Create Identity Documents Table
-- Run this SQL in your Supabase SQL Editor

-- Create identity_documents table for storing uploaded identity documents
CREATE TABLE IF NOT EXISTS identity_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    issuing_country VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(255),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_identity_documents_email FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE,
    
    -- Ensure one document per user (can be updated)
    CONSTRAINT unique_user_document UNIQUE (email)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_identity_documents_email ON identity_documents(email);
CREATE INDEX IF NOT EXISTS idx_identity_documents_verification_status ON identity_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_identity_documents_upload_date ON identity_documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_identity_documents_document_type ON identity_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_identity_documents_issuing_country ON identity_documents(issuing_country);

-- Add comments for documentation
COMMENT ON TABLE identity_documents IS 'Stores uploaded identity documents for user verification';
COMMENT ON COLUMN identity_documents.email IS 'User email address (foreign key to users table)';
COMMENT ON COLUMN identity_documents.issuing_country IS 'Country that issued the identity document';
COMMENT ON COLUMN identity_documents.document_type IS 'Type of document (passport, drivers_license, national_id, etc.)';
COMMENT ON COLUMN identity_documents.file_path IS 'Local file system path to the uploaded document';
COMMENT ON COLUMN identity_documents.file_name IS 'Original filename of the uploaded document';
COMMENT ON COLUMN identity_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN identity_documents.file_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN identity_documents.upload_date IS 'When the document was uploaded';
COMMENT ON COLUMN identity_documents.verification_status IS 'Status: pending, approved, rejected';
COMMENT ON COLUMN identity_documents.verified_at IS 'When the document was verified (if approved)';
COMMENT ON COLUMN identity_documents.verified_by IS 'Admin user who verified the document';
COMMENT ON COLUMN identity_documents.rejection_reason IS 'Reason for rejection (if rejected)';

-- Add identity_document_uploaded column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS identity_document_uploaded BOOLEAN DEFAULT FALSE;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_users_identity_document_uploaded
ON users(identity_document_uploaded);

-- Add comment for the new column
COMMENT ON COLUMN users.identity_document_uploaded IS 'Whether user has uploaded an identity document';

-- Create a view for easy document verification status checking
CREATE OR REPLACE VIEW user_document_verification_status AS
SELECT
    u.email,
    u.first_name,
    u.last_name,
    u.identity_verified_at,
    u.identity_verification_status,
    u.identity_document_uploaded,
    id.document_type,
    id.issuing_country,
    id.verification_status,
    id.upload_date,
    id.verified_at,
    id.rejection_reason
FROM users u
LEFT JOIN identity_documents id ON u.email = id.email;

-- Add comment for the view
COMMENT ON VIEW user_document_verification_status IS 'Combined view of user document verification status';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_identity_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_identity_documents_updated_at ON identity_documents;
CREATE TRIGGER trigger_update_identity_documents_updated_at
    BEFORE UPDATE ON identity_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_identity_documents_updated_at();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON identity_documents TO authenticated;
-- GRANT SELECT ON user_document_verification_status TO authenticated;
