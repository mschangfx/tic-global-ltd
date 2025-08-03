import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

    const supabase = createClient();

    // Check user_referral_codes table
    const { data: referralCodes, error: codesError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('user_email', userEmail);

    // Check user_profiles table
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', userEmail);

    // Check all referral codes with old domain
    const { data: allOldCodes, error: oldCodesError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .like('referral_link', '%ticglobal.com%');

    // Check all profiles with old domain
    const { data: allOldProfiles, error: oldProfilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .like('referral_link', '%ticglobal.com%');

    return NextResponse.json({
      success: true,
      userEmail,
      data: {
        user_referral_codes: {
          data: referralCodes,
          error: codesError
        },
        user_profiles: {
          data: userProfiles,
          error: profilesError
        },
        all_old_referral_codes: {
          data: allOldCodes,
          error: oldCodesError,
          count: allOldCodes?.length || 0
        },
        all_old_profiles: {
          data: allOldProfiles,
          error: oldProfilesError,
          count: allOldProfiles?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Error debugging referral data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
