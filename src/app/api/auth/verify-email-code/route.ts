import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { message: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Retrieve the stored verification code from your database
    // 2. Check if the code matches and hasn't expired
    // 3. Mark the email as verified in your user profile

    // For development/testing, we'll accept any 6-digit code
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { message: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    // Simulate verification logic
    // In production, you would check against the stored code
    const isValidCode = true; // For demo purposes, always accept valid format

    if (!isValidCode) {
      return NextResponse.json(
        { message: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // In production, update user's email verification status in database
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
      { message: 'Failed to verify email code' },
      { status: 500 }
    );
  }
}
