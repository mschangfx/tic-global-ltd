import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerEmail?: string }> {
  try {
    console.log('🔍 Validating referral code:', code);

    // First check user_referral_codes table
    const { data: referralCodeData, error: codeError } = await supabaseAdmin
      .from('user_referral_codes')
      .select('user_email')
      .eq('referral_code', code)
      .single();

    if (codeError) {
      console.log('❌ Error querying user_referral_codes:', codeError);
    }

    if (referralCodeData) {
      console.log('✅ Found referral code in user_referral_codes:', referralCodeData.user_email);
      return {
        valid: true,
        referrerEmail: referralCodeData.user_email
      };
    }

    // Fallback to users table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('referral_id', code)
      .single();

    if (profileError) {
      console.log('❌ Error querying users table:', profileError);
    }

    if (profileData) {
      console.log('✅ Found referral code in users table:', profileData.email);
      return {
        valid: true,
        referrerEmail: profileData.email
      };
    }

    console.log('❌ Referral code not found in any table');
    return { valid: false };
  } catch (error) {
    console.error('❌ Error validating referral code:', error);
    return { valid: false };
  }
}

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

    const validation = await validateReferralCode(referralCode);

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

    const validation = await validateReferralCode(referralCode);

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
