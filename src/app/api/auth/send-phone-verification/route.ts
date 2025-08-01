import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendVerificationSMS, isValidPhoneNumber, formatPhoneNumber, getPreferredSMSMethod } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format using our SMS utility
    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json(
        { message: 'Invalid phone number format. Please include country code (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // Format phone number consistently
    const formattedPhone = formatPhoneNumber(phone);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Get Supabase client
    const supabase = createClient();

    // Set expiration time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Delete any existing verification code for this phone number
    await supabase
      .from('phone_verifications')
      .delete()
      .eq('phone_number', formattedPhone);

    // Store the verification code in the database
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: formattedPhone,
        code: verificationCode,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error storing phone verification code:', insertError);
      return NextResponse.json(
        { message: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Get the SMS method that will be used
    const smsMethod = getPreferredSMSMethod();

    // For Firebase, we don't generate a code here - Firebase handles it
    if (smsMethod === 'firebase') {
      console.log(`📱 Using Firebase Auth for phone verification: ${formattedPhone}`);

      return NextResponse.json(
        {
          message: 'Ready for Firebase phone verification',
          method: 'firebase',
          phoneNumber: formattedPhone
        },
        { status: 200 }
      );
    }

    // For Twilio or development mode, generate and send code
    const smsResult = await sendVerificationSMS(formattedPhone, verificationCode);

    if (!smsResult.success) {
      console.error('Failed to send SMS:', smsResult.error);
      return NextResponse.json(
        { message: smsResult.error || 'Failed to send verification code' },
        { status: 500 }
      );
    }

    console.log(`📱 Phone verification code sent to ${formattedPhone}. Method: ${smsResult.method}, Message ID: ${smsResult.messageId}`);

    return NextResponse.json(
      {
        message: 'Verification code sent successfully',
        method: smsResult.method,
        // For development mode, include the code for testing
        ...(smsResult.devCode && {
          code: smsResult.devCode,
          devMessage: `Development mode: Your verification code is ${smsResult.devCode}`
        })
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending phone verification:', error);
    return NextResponse.json(
      { message: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
