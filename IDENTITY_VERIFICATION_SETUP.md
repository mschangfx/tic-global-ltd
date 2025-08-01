# Identity Verification System Setup

This document explains how to set up and use the identity verification system for the TIC Global website.

## Overview

The identity verification system allows users to upload identity documents (passport, driver's license, national ID, etc.) for verification. The system includes:

1. **Document Upload Interface** - User-friendly modal with country selection, document type selection, and file upload
2. **Backend API** - Secure file upload and database storage
3. **Database Schema** - Tables for storing document information and verification status
4. **File Storage** - Local file system storage with security measures

## Setup Instructions

### 1. Database Setup

Run the database migration to create the necessary tables:

```sql
-- Run this in your Supabase SQL Editor
-- File: database-migration-identity-documents.sql
```

This will create:
- `identity_documents` table for storing document information
- Indexes for performance
- Views for easy status checking
- Triggers for automatic timestamp updates

### 2. File Storage Setup

The system stores uploaded files locally in the `uploads/identity-documents/` directory:

```
uploads/
└── identity-documents/
    ├── user1_email_com_1234567890.jpg
    ├── user2_email_com_1234567891.png
    └── ...
```

Files are automatically named with:
- Sanitized email address
- Timestamp
- Original file extension

### 3. Environment Variables

No additional environment variables are required. The system uses existing Supabase configuration.

## Usage

### For Users

1. **Access Identity Verification**
   - Go to Dashboard
   - Click "Complete profile" if verification banner is shown
   - Navigate through the verification steps
   - Reach identity verification step

2. **Upload Documents**
   - Select issuing country from dropdown
   - Choose document type (passport, driver's license, etc.)
   - Review photo guidelines
   - Upload document file (JPEG, PNG, WebP, max 10MB)
   - Submit for verification

3. **Verification Status**
   - Documents are marked as "pending" after upload
   - Admin review required for approval/rejection
   - Users receive status updates

### For Administrators

#### Web Interface (Recommended)

1. **Access Admin Panel**
   - Navigate to `/admin/identity-documents`
   - View all uploaded documents with filtering options
   - Filter by status (pending, approved, rejected)
   - Search by user email

2. **Review Documents**
   - Click "Review" button for pending documents
   - View user information and document details
   - Approve or reject with optional reason

3. **Bulk Operations**
   - Filter documents by status
   - Process multiple documents efficiently

#### SQL Interface (Advanced)

1. **View Uploaded Documents**
   ```sql
   SELECT * FROM user_document_verification_status
   WHERE verification_status = 'pending'
   ORDER BY upload_date DESC;
   ```

2. **Approve Document**
   ```sql
   UPDATE identity_documents
   SET verification_status = 'approved',
       verified_at = NOW(),
       verified_by = 'admin_username'
   WHERE email = 'user@example.com';

   UPDATE user_verification_status
   SET identity_verified = true,
       updated_at = NOW()
   WHERE email = 'user@example.com';
   ```

3. **Reject Document**
   ```sql
   UPDATE identity_documents
   SET verification_status = 'rejected',
       rejection_reason = 'Document not clear enough'
   WHERE email = 'user@example.com';
   ```

## API Endpoints

### POST /api/auth/upload-identity-document

Handles document upload and storage.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `document`: File (image)
  - `email`: User email
  - `issuingCountry`: Country that issued the document
  - `documentType`: Type of document

**Response:**
```json
{
  "message": "Document uploaded successfully",
  "documentId": "uuid",
  "fileName": "sanitized_filename.jpg",
  "verificationStatus": "pending"
}
```

### GET /api/auth/identity-documents

Retrieves uploaded documents for admin review.

**Query Parameters:**
- `status`: Filter by verification status (pending, approved, rejected, all)
- `email`: Filter by user email
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "documents": [...],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

### PUT /api/auth/identity-documents

Updates document verification status.

**Request:**
- Method: PUT
- Content-Type: application/json
- Body:
  - `email`: User email
  - `status`: New status (approved, rejected, pending)
  - `rejectionReason`: Reason for rejection (if status is rejected)
  - `verifiedBy`: Admin username

**Response:**
```json
{
  "message": "Document approved successfully",
  "email": "user@example.com",
  "status": "approved"
}
```

## Security Features

1. **File Type Validation**
   - Only allows image files (JPEG, PNG, WebP)
   - Validates MIME types

2. **File Size Limits**
   - Maximum 10MB per file
   - Prevents large file uploads

3. **Secure File Storage**
   - Files stored outside web root
   - Sanitized filenames
   - No direct web access

4. **Database Security**
   - Foreign key constraints
   - Proper indexing
   - Audit trail with timestamps

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── identity-documents/
│   │       └── page.tsx (admin interface)
│   ├── api/
│   │   └── auth/
│   │       ├── upload-identity-document/
│   │       │   └── route.ts
│   │       └── identity-documents/
│   │           └── route.ts (admin API)
│   └── (dashboard)/
│       └── dashboard/
│           └── page.tsx (contains upload modal)
├── uploads/ (created automatically)
│   └── identity-documents/
├── database-migration-identity-documents.sql
└── IDENTITY_VERIFICATION_SETUP.md
```

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (max 10MB)
   - Verify file type (JPEG, PNG, WebP only)
   - Ensure uploads directory exists and is writable

2. **Database Errors**
   - Run the migration script
   - Check foreign key constraints
   - Verify user exists in users table

3. **Permission Issues**
   - Ensure uploads directory has write permissions
   - Check Supabase service role key

### Error Messages

- "Missing required fields" - Form data incomplete
- "Invalid file type" - Unsupported file format
- "File too large" - Exceeds 10MB limit
- "Database error occurred" - Database connection/query issue

## Future Enhancements

1. **Cloud Storage Integration**
   - AWS S3 or Supabase Storage
   - Better scalability and security

2. **Automatic OCR Verification**
   - Extract text from documents
   - Validate against user profile

3. **Real-time Status Updates**
   - WebSocket notifications
   - Email notifications

4. **Admin Dashboard**
   - Web interface for document review
   - Bulk approval/rejection tools

## Support

For technical support or questions about the identity verification system, please contact the development team.
