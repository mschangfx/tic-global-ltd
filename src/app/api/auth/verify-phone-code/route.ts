import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatPhoneNumber } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const { phone, code, email } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { message: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { message: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    // Format phone number consistently
    const formattedPhone = formatPhoneNumber(phone);

    // Get Supabase client
    const supabase = createClient();

    // Get verification record from database
    const { data: verification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('code', code)
      .single();

    if (fetchError || !verification) {
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);

    if (now > expiresAt) {
      // Delete expired verification code
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('phone_number', formattedPhone);

      return NextResponse.json(
        { message: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // Mark phone as verified in the users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        phone_number: formattedPhone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString()
      })
      .eq('email', email || formattedPhone); // Use email if provided, otherwise phone

    if (updateError) {
      console.error('Error updating user phone verification status:', updateError);
      // Continue anyway as the verification was successful
    }

    // Delete the used verification code
    await supabase
      .from('phone_verifications')
      .delete()
      .eq('phone_number', formattedPhone);

    console.log(`✅ Phone ${formattedPhone} verified successfully with code ${code}`);

    return NextResponse.json(
      {
        message: 'Phone number verified successfully',
        verified: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error verifying phone code:', error);
    return NextResponse.json(
      { message: 'Failed to verify phone code' },
      { status: 500 }
    );
  }
}
