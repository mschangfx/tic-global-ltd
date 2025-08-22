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

    // Update user's email verification status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating user verification status:', updateError);
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
