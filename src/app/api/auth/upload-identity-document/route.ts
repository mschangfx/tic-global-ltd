import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Identity document upload started');

    const formData = await request.formData();
    const file = formData.get('document') as File;
    const email = formData.get('email') as string;
    const issuingCountry = formData.get('issuingCountry') as string || null;
    const documentType = formData.get('documentType') as string;

    console.log('📋 Upload request data:', {
      fileName: file?.name,
      fileSize: file?.size,
      email,
      documentType,
      issuingCountry
    });

    if (!file || !email || !documentType) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, WebP, or PDF files only.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('❌ File too large:', file.size);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename for Supabase Storage
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedEmail}_${timestamp}.${fileExtension}`;
    const storagePath = `identity-documents/${fileName}`;

    console.log('📁 Uploading to Supabase Storage:', storagePath);

    // Upload file to Supabase Storage
    const bytes = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-uploads')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded to storage:', uploadData.path);

    // Get the public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('user-uploads')
      .getPublicUrl(storagePath);

    console.log('🔗 File public URL:', urlData.publicUrl);

    // Store document information in database
    console.log('💾 Storing document info in database...');

    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('identity_documents')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching existing document:', fetchError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    const documentData = {
      email,
      issuing_country: issuingCountry,
      document_type: documentType,
      file_path: storagePath,
      file_url: urlData.publicUrl,
      file_name: fileName,
      file_size: file.size,
      file_type: file.type,
      upload_date: new Date().toISOString(),
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    };

    console.log('📋 Document data to save:', documentData);

    let result;
    if (existingRecord) {
      console.log('🔄 Updating existing document record');
      // Update existing record
      const { data, error } = await supabaseAdmin
        .from('identity_documents')
        .update(documentData)
        .eq('email', email)
        .select();

      result = { data, error };
    } else {
      console.log('➕ Creating new document record');
      // Insert new record
      const { data, error } = await supabaseAdmin
        .from('identity_documents')
        .insert([documentData])
        .select();

      result = { data, error };
    }

    if (result.error) {
      console.error('❌ Error saving document to database:', result.error);
      return NextResponse.json(
        { error: 'Failed to save document information' },
        { status: 500 }
      );
    }

    console.log('✅ Document saved to database:', result.data?.[0]?.id);

    // Update user verification status
    console.log('🔄 Updating user verification status...');
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
      console.error('❌ Error updating verification status:', updateError);
      // Don't return error here as the document was uploaded successfully
    } else {
      console.log('✅ User verification status updated');
    }

    console.log('🎉 Document upload completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      documentId: result.data?.[0]?.id,
      fileName: fileName,
      verificationStatus: 'pending'
    });

  } catch (error) {
    console.error('❌ Error uploading document:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload document. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
