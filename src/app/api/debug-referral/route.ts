import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const referralCode = searchParams.get('code');

    if (!email && !referralCode) {
      return NextResponse.json(
        { error: 'Either email or referral code is required' },
        { status: 400 }
      );
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      query: { email, referralCode }
    };

    // If email is provided, get user's referral information
    if (email) {
      debugInfo.userInfo = {};

      // Check users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email, referral_code, referral_id, created_at')
        .eq('email', email)
        .single();

      debugInfo.userInfo.usersTable = {
        data: userData,
        error: userError?.message || null
      };

      // Check user_referral_codes table
      const { data: referralCodeData, error: referralCodeError } = await supabaseAdmin
        .from('user_referral_codes')
        .select('*')
        .eq('user_email', email)
        .single();

      debugInfo.userInfo.userReferralCodesTable = {
        data: referralCodeData,
        error: referralCodeError?.message || null
      };

      // Check referral relationships where user is referrer
      const { data: asReferrer, error: referrerError } = await supabaseAdmin
        .from('referral_relationships')
        .select('*')
        .eq('referrer_email', email);

      debugInfo.userInfo.asReferrer = {
        data: asReferrer,
        count: asReferrer?.length || 0,
        error: referrerError?.message || null
      };

      // Check referral relationships where user is referred
      const { data: asReferred, error: referredError } = await supabaseAdmin
        .from('referral_relationships')
        .select('*')
        .eq('referred_email', email);

      debugInfo.userInfo.asReferred = {
        data: asReferred,
        error: referredError?.message || null
      };
    }

    // If referral code is provided, validate it
    if (referralCode) {
      debugInfo.codeValidation = {};

      // Check user_referral_codes table
      const { data: codeInReferralTable, error: codeReferralError } = await supabaseAdmin
        .from('user_referral_codes')
        .select('user_email, referral_code, created_at')
        .eq('referral_code', referralCode)
        .single();

      debugInfo.codeValidation.userReferralCodesTable = {
        data: codeInReferralTable,
        error: codeReferralError?.message || null,
        found: !!codeInReferralTable
      };

      // Check users table for referral_code
      const { data: codeInUsersTable, error: codeUsersError } = await supabaseAdmin
        .from('users')
        .select('email, referral_code, created_at')
        .eq('referral_code', referralCode)
        .single();

      debugInfo.codeValidation.usersTableReferralCode = {
        data: codeInUsersTable,
        error: codeUsersError?.message || null,
        found: !!codeInUsersTable
      };

      // Check users table for referral_id (legacy)
      const { data: codeInUsersReferralId, error: codeUsersReferralIdError } = await supabaseAdmin
        .from('users')
        .select('email, referral_id, created_at')
        .eq('referral_id', referralCode)
        .single();

      debugInfo.codeValidation.usersTableReferralId = {
        data: codeInUsersReferralId,
        error: codeUsersReferralIdError?.message || null,
        found: !!codeInUsersReferralId
      };

      // Overall validation result
      debugInfo.codeValidation.isValid = !!(
        codeInReferralTable || 
        codeInUsersTable || 
        codeInUsersReferralId
      );

      debugInfo.codeValidation.validatedBy = [];
      if (codeInReferralTable) debugInfo.codeValidation.validatedBy.push('user_referral_codes');
      if (codeInUsersTable) debugInfo.codeValidation.validatedBy.push('users.referral_code');
      if (codeInUsersReferralId) debugInfo.codeValidation.validatedBy.push('users.referral_id');
    }

    // Get some general statistics
    debugInfo.statistics = {};

    // Count total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    debugInfo.statistics.totalUsers = totalUsers;

    // Count users with referral codes
    const { count: usersWithCodes } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('referral_code', 'is', null);

    debugInfo.statistics.usersWithReferralCodes = usersWithCodes;

    // Count referral relationships
    const { count: totalRelationships } = await supabaseAdmin
      .from('referral_relationships')
      .select('*', { count: 'exact', head: true });

    debugInfo.statistics.totalReferralRelationships = totalRelationships;

    // Count entries in user_referral_codes
    const { count: referralCodeEntries } = await supabaseAdmin
      .from('user_referral_codes')
      .select('*', { count: 'exact', head: true });

    debugInfo.statistics.userReferralCodeEntries = referralCodeEntries;

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, referralCode } = body;

    if (action === 'test-referral-flow') {
      if (!email || !referralCode) {
        return NextResponse.json(
          { error: 'Email and referral code are required for test flow' },
          { status: 400 }
        );
      }

      const testResults: any = {
        timestamp: new Date().toISOString(),
        testEmail: email,
        testReferralCode: referralCode,
        steps: []
      };

      // Step 1: Validate referral code
      testResults.steps.push({
        step: 1,
        name: 'Validate Referral Code',
        status: 'running'
      });

      const validation = await fetch(`${process.env.NEXTAUTH_URL || 'https://ticgloballtd.com'}/api/referrals/validate?code=${encodeURIComponent(referralCode)}`);
      const validationResult = await validation.json();

      testResults.steps[0].status = validationResult.isValid ? 'success' : 'failed';
      testResults.steps[0].result = validationResult;

      if (!validationResult.isValid) {
        return NextResponse.json(testResults);
      }

      // Step 2: Test referral registration
      testResults.steps.push({
        step: 2,
        name: 'Process Referral Registration',
        status: 'running'
      });

      const registration = await fetch(`${process.env.NEXTAUTH_URL || 'https://ticgloballtd.com'}/api/referrals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: referralCode,
          newUserEmail: email
        })
      });

      const registrationResult = await registration.json();
      testResults.steps[1].status = registrationResult.success ? 'success' : 'failed';
      testResults.steps[1].result = registrationResult;

      return NextResponse.json(testResults);
    }

    // New action: Check if referral relationship exists
    if (action === 'check_relationship') {
      const referrerEmail = searchParams.get('referrerEmail');
      const referredEmail = searchParams.get('referredEmail');

      if (!referrerEmail || !referredEmail) {
        return NextResponse.json({
          error: 'Both referrerEmail and referredEmail are required'
        }, { status: 400 });
      }

      // Check referral_relationships table
      const { data: relationship, error: relationshipError } = await supabaseAdmin
        .from('referral_relationships')
        .select('*')
        .eq('referrer_email', referrerEmail)
        .eq('referred_email', referredEmail)
        .single();

      // Also check if user has referral_id set
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email, referral_id, referral_code')
        .eq('email', referredEmail)
        .single();

      return NextResponse.json({
        relationshipExists: !!relationship,
        relationshipData: relationship,
        relationshipError: relationshipError?.message || null,
        userData: userData,
        userError: userError?.message || null,
        hasReferralId: !!userData?.referral_id
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Debug referral POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
