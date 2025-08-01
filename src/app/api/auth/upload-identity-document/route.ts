import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('document') as File;
    const email = formData.get('email') as string;
    const issuingCountry = formData.get('issuingCountry') as string;
    const documentType = formData.get('documentType') as string;

    if (!file || !email || !issuingCountry || !documentType) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Please upload JPEG, PNG, or WebP images only.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'identity-documents');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedEmail}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Save file to local storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Store document information in database
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('identity_documents')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching existing document:', fetchError);
      return NextResponse.json(
        { message: 'Database error occurred' },
        { status: 500 }
      );
    }

    const documentData = {
      email,
      issuing_country: issuingCountry,
      document_type: documentType,
      file_path: filePath,
      file_name: fileName,
      file_size: file.size,
      file_type: file.type,
      upload_date: new Date().toISOString(),
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabaseAdmin
        .from('identity_documents')
        .update(documentData)
        .eq('email', email)
        .select();
      
      result = { data, error };
    } else {
      // Insert new record
      const { data, error } = await supabaseAdmin
        .from('identity_documents')
        .insert([documentData])
        .select();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Error saving document to database:', result.error);
      return NextResponse.json(
        { message: 'Failed to save document information' },
        { status: 500 }
      );
    }

    // Update user verification status
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        identity_verification_submitted: true,
        identity_verification_submitted_at: new Date().toISOString(),
        identity_document_uploaded: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      // Don't return error here as the document was uploaded successfully
    }

    return NextResponse.json({
      message: 'Document uploaded successfully',
      documentId: result.data?.[0]?.id,
      fileName: fileName,
      verificationStatus: 'pending'
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
