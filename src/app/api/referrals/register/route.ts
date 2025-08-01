import { NextRequest, NextResponse } from 'next/server';
import ReferralKitService from '@/lib/services/referralKitService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, newUserEmail } = body;

    if (!newUserEmail) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User email is required' 
        },
        { status: 400 }
      );
    }

    const referralKitService = ReferralKitService.getInstance();

    // If no referral code provided, just return success
    if (!referralCode) {
      return NextResponse.json({
        success: true,
        message: 'User registered without referral',
        hasReferrer: false
      });
    }

    // Validate referral code first
    const validation = await referralKitService.validateReferralCode(referralCode);
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid referral code',
        hasReferrer: false
      });
    }

    // Process the referral registration
    const result = await referralKitService.processReferralRegistration(
      referralCode,
      newUserEmail
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Referral processed successfully',
        hasReferrer: true,
        referrerEmail: validation.referrerEmail
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        hasReferrer: false
      });
    }

  } catch (error) {
    console.error('Error in referral registration API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
