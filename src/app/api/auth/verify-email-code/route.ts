import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check if verification code exists and is valid
    const { data: verificationData, error: verificationError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .single();

    if (verificationError || !verificationData) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    console.log('📧 Email verification - Existing user check:', existingUser);
    console.log('📧 Email verification - Check error:', checkError);

    let updateResult;
    if (!existingUser && checkError?.code === 'PGRST116') {
      // User doesn't exist, create new user record with email verified
      console.log('📧 Creating new user record with email verified for:', email);
      const { data, error: createError } = await supabase
        .from('users')
        .insert({
          email: email,
          email_verified: true,
          profile_completed: false,
          identity_verification_submitted: false,
          identity_verification_status: 'pending',
          identity_document_uploaded: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      updateResult = { data, error: createError };
    } else if (existingUser) {
      // User exists, update email verification status
      console.log('📧 Updating existing user email verification for:', email);
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      updateResult = { data, error: updateError };
    } else {
      console.error('📧 Unexpected error checking user existence:', checkError);
      return NextResponse.json(
        { error: 'Database error during verification' },
        { status: 500 }
      );
    }

    console.log('📧 Email verification update result:', updateResult);

    if (updateResult.error) {
      console.error('Error updating user verification status:', updateResult.error);
      return NextResponse.json(
        { error: 'Failed to update verification status' },
        { status: 500 }
      );
    }

    // Delete the used verification code
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email);

    console.log(`✅ Email ${email} verified successfully with code ${code}`);

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        verified: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error verifying email code:', error);
    return NextResponse.json(
      { error: 'Failed to verify email code' },
      { status: 500 }
    );
  }
}
