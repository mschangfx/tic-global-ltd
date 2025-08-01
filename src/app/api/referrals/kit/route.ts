import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ReferralKitService from '@/lib/services/referralKitService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user email from session
    const session = await getServerSession(authOptions as any);
    const userEmail = (session as any)?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      );
    }

    const referralKitService = ReferralKitService.getInstance();
    const kitData = await referralKitService.getReferralKitData(userEmail);

    return NextResponse.json(kitData);

  } catch (error) {
    console.error('Error in referral kit API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referralCode, newUserEmail } = body;

    // Get authenticated user email from session
    const session = await getServerSession(authOptions as any);
    const userEmail = (session as any)?.user?.email;

    const referralKitService = ReferralKitService.getInstance();

    switch (action) {
      case 'generate_code':
        if (!userEmail) {
          return NextResponse.json(
            { message: 'User email is required' },
            { status: 400 }
          );
        }

        const kitData = await referralKitService.getReferralKitData(userEmail);
        return NextResponse.json({
          success: true,
          code: kitData.referralCode,
          link: kitData.referralLink,
          message: 'Referral code generated successfully'
        });

      case 'regenerate_code':
        if (!userEmail) {
          return NextResponse.json(
            { message: 'User email is required' },
            { status: 400 }
          );
        }

        const regenerateResult = await referralKitService.regenerateReferralCode(userEmail);
        if (regenerateResult.success) {
          return NextResponse.json({
            success: true,
            code: regenerateResult.code,
            link: regenerateResult.link,
            message: regenerateResult.message
          });
        } else {
          return NextResponse.json(
            { message: regenerateResult.message },
            { status: 500 }
          );
        }

      case 'validate_code':
        if (!referralCode) {
          return NextResponse.json(
            { message: 'Referral code is required' },
            { status: 400 }
          );
        }

        const validation = await referralKitService.validateReferralCode(referralCode);
        return NextResponse.json(validation);

      case 'process_referral':
        if (!referralCode || !newUserEmail) {
          return NextResponse.json(
            { message: 'Referral code and new user email are required' },
            { status: 400 }
          );
        }

        const result = await referralKitService.processReferralRegistration(
          referralCode,
          newUserEmail
        );
        return NextResponse.json(result);

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in referral kit POST API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
