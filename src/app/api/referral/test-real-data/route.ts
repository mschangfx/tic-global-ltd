import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    const supabase = createClient();

    // Test 1: Get user's referral code and link
    const { data: referralCode, error: codeError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Test 2: Get user's referral relationships
    const { data: relationships, error: relError } = await supabase
      .from('referral_relationships')
      .select('*')
      .eq('referrer_email', userEmail)
      .eq('is_active', true);

    // Test 3: Get user's commission earnings
    const { data: commissions, error: commError } = await supabase
      .from('referral_commissions')
      .select('*')
      .eq('earner_email', userEmail);

    // Test 4: Get user's active plans
    const { data: plans, error: plansError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true);

    // Calculate real statistics
    const totalReferrals = relationships?.length || 0;
    const directReferrals = relationships?.filter(r => r.level_depth === 1).length || 0;
    const totalEarnings = commissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) || 0;
    
    // Calculate monthly earnings (current month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyEarnings = commissions?.filter(c => 
      c.calculation_date?.startsWith(currentMonth)
    ).reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) || 0;

    // Test 5: Check if user has any referrers (who referred this user)
    const { data: referrers, error: referrersError } = await supabase
      .from('referral_relationships')
      .select('referrer_email, level_depth')
      .eq('referred_email', userEmail)
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      userEmail,
      testResults: {
        hasReferralCode: !!referralCode,
        referralCodeData: referralCode,
        codeError: codeError?.message || null,
        
        totalReferrals,
        directReferrals,
        relationshipsData: relationships,
        relationshipsError: relError?.message || null,
        
        totalEarnings: totalEarnings.toFixed(4),
        monthlyEarnings: monthlyEarnings.toFixed(4),
        commissionsCount: commissions?.length || 0,
        commissionsData: commissions,
        commissionsError: commError?.message || null,
        
        activePlansCount: plans?.length || 0,
        plansData: plans,
        plansError: plansError?.message || null,
        
        referrersCount: referrers?.length || 0,
        referrersData: referrers,
        referrersError: referrersError?.message || null
      },
      realTimeStats: {
        totalReferrals,
        directReferrals,
        totalEarnings: totalEarnings.toFixed(2),
        monthlyEarnings: monthlyEarnings.toFixed(2),
        currentLevel: Math.min(totalReferrals + 1, 15),
        hasActiveVipPlan: plans?.some(p => p.plan_type === 'vip') || false,
        isReferredUser: (referrers?.length || 0) > 0
      },
      databaseStatus: {
        referralCodeTable: !codeError,
        relationshipsTable: !relError,
        commissionsTable: !commError,
        plansTable: !plansError,
        referrersTable: !referrersError
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing real referral data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to create test referral data for a user
export async function POST(request: NextRequest) {
  try {
    const { userEmail, action } = await request.json();

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    const supabase = createClient();

    switch (action) {
      case 'create-referral-code':
        // Generate referral code if user doesn't have one
        const referralCode = `TIC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const referralLink = `https://ticgloballtd.com/join?ref=${referralCode}`;

        const { data: newCode, error: createError } = await supabase
          .from('user_referral_codes')
          .upsert({
            user_email: userEmail,
            referral_code: referralCode,
            referral_link: referralLink,
            total_referrals: 0,
            total_earnings: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_email'
          })
          .select()
          .single();

        if (createError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to create referral code',
            details: createError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Referral code created successfully',
          data: newCode
        });

      case 'simulate-commission':
        // Create a test commission entry
        const { data: commission, error: commissionError } = await supabase
          .from('referral_commissions')
          .insert({
            earner_email: userEmail,
            referral_email: 'test@example.com',
            commission_level: 1,
            commission_rate: 10.0,
            base_earnings: 0.44,
            commission_amount: 0.044,
            plan_type: 'vip',
            calculation_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (commissionError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to create test commission',
            details: commissionError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Test commission created successfully',
          data: commission
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in POST test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
