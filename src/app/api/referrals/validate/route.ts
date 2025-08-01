import { NextRequest, NextResponse } from 'next/server';
import ReferralKitService from '@/lib/services/referralKitService';

export async function POST(request: NextRequest) {
  try {
    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Referral code is required'
        },
        { status: 400 }
      );
    }

    const referralKitService = ReferralKitService.getInstance();
    const validation = await referralKitService.validateReferralCode(referralCode);

    if (validation.valid) {
      return NextResponse.json({
        isValid: true,
        message: 'Valid referral code',
        referrer: {
          name: 'TIC Global Member',
          email: validation.referrerEmail
        }
      });
    } else {
      return NextResponse.json({
        isValid: false,
        message: 'Invalid referral code. Please check and try again.'
      });
    }

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      {
        isValid: false,
        message: 'Failed to validate referral code'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get('code');

    if (!referralCode) {
      return NextResponse.json(
        {
          isValid: false,
          message: 'Referral code is required'
        },
        { status: 400 }
      );
    }

    const referralKitService = ReferralKitService.getInstance();
    const validation = await referralKitService.validateReferralCode(referralCode);

    if (validation.valid) {
      return NextResponse.json({
        isValid: true,
        message: 'Valid referral code',
        referrer: {
          name: 'TIC Global Member'
        }
      });
    } else {
      return NextResponse.json({
        isValid: false,
        message: 'Invalid referral code'
      });
    }

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      {
        isValid: false,
        message: 'Failed to validate referral code'
      },
      { status: 500 }
    );
  }
}
