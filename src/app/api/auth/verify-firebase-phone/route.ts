import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatPhoneNumber } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const { phone, verificationId, code, email } = await request.json();

    if (!phone || !verificationId || !code) {
      return NextResponse.json(
        { message: 'Phone number, verification ID, and code are required' },
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

    // Note: Firebase verification happens on the client side
    // This endpoint is called after Firebase has already verified the code
    // We just need to update our database

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
      return NextResponse.json(
        { message: 'Failed to update verification status' },
        { status: 500 }
      );
    }

    console.log(`✅ Phone ${formattedPhone} verified successfully via Firebase`);

    return NextResponse.json(
      {
        message: 'Phone number verified successfully',
        verified: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error verifying Firebase phone code:', error);
    return NextResponse.json(
      { message: 'Failed to verify phone code' },
      { status: 500 }
    );
  }
}
