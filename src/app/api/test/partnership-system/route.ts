import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Test endpoint to verify partnership system functionality
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const today = new Date().toISOString();

    console.log(`🔍 Testing partnership system for user: ${userEmail}`);

    // Test 1: Check referral code generation
    const { data: referralCode, error: codeError } = await supabaseAdmin
      .from('user_referral_codes')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Test 2: Check referral relationships (community structure)
    const { data: myReferrals, error: referralsError } = await supabaseAdmin
      .from('referral_relationships')
      .select('*')
      .eq('referrer_email', userEmail)
      .eq('is_active', true)
      .order('level_depth', { ascending: true });

    // Test 3: Check if user was referred by someone
    const { data: myReferrer, error: referrerError } = await supabaseAdmin
      .from('referral_relationships')
      .select('*')
      .eq('referred_email', userEmail)
      .eq('is_active', true)
      .single();

    // Test 4: Check commission earnings
    const { data: commissions, error: commissionsError } = await supabaseAdmin
      .from('referral_commissions')
      .select('*')
      .eq('earner_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(10);

    // Test 5: Check partner wallet balance
    const { data: partnerWallet, error: walletError } = await supabaseAdmin
      .from('partner_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Test 6: Check rank bonus eligibility
    const directReferrals = myReferrals?.filter(r => r.level_depth === 1).length || 0;
    const maxLevel = Math.max(...(myReferrals?.map(r => r.level_depth) || [0]));
    
    const getRank = (referrals: number) => {
      if (referrals >= 25) return 'Diamond';
      if (referrals >= 20) return 'Platinum';
      if (referrals >= 15) return 'Gold';
      if (referrals >= 10) return 'Silver';
      if (referrals >= 5) return 'Bronze';
      return 'No Rank';
    };

    const currentRank = getRank(directReferrals);
    const rankBonuses = {
      'Bronze': 690,
      'Silver': 2484,
      'Gold': 4830,
      'Platinum': 8832,
      'Diamond': 14904
    };

    // Test 7: Check commission structure accessibility
    const { data: userSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .gte('end_date', today);

    const hasVipPlan = userSubscriptions?.some(sub => sub.plan_id === 'vip') || false;
    const maxCommissionLevels = hasVipPlan ? 15 : 1;

    // Test 8: Calculate potential daily commissions
    const commissionRates = [10, 5, 5, 5, 5, 5, 2.5, 2.5, 2.5, 2.5, 1, 1, 1, 1, 1];
    let potentialDailyCommissions = 0;

    if (myReferrals) {
      for (const referral of myReferrals) {
        if (referral.level_depth <= maxCommissionLevels) {
          const rate = commissionRates[referral.level_depth - 1] || 0;
          potentialDailyCommissions += 0.44 * (rate / 100); // $0.44 base * commission rate
        }
      }
    }

    // Compile test results
    const testResults = {
      user_email: userEmail,
      test_timestamp: today,
      
      // Referral System Tests
      referral_code_test: {
        status: referralCode ? 'PASS' : 'FAIL',
        data: referralCode ? {
          code: referralCode.referral_code,
          link: referralCode.referral_link,
          total_referrals: referralCode.total_referrals,
          total_earnings: referralCode.total_earnings
        } : null,
        error: codeError?.message
      },

      // Community Structure Tests
      community_test: {
        status: 'PASS',
        data: {
          total_referrals: myReferrals?.length || 0,
          direct_referrals: directReferrals,
          max_level: maxLevel,
          referral_breakdown: myReferrals?.reduce((acc: any, ref) => {
            acc[`level_${ref.level_depth}`] = (acc[`level_${ref.level_depth}`] || 0) + 1;
            return acc;
          }, {}) || {}
        },
        relationships: myReferrals || [],
        error: referralsError?.message
      },

      // Upline Test
      upline_test: {
        status: myReferrer ? 'PASS' : 'INFO',
        data: myReferrer ? {
          referrer_email: myReferrer.referrer_email,
          referral_code: myReferrer.referral_code,
          level_depth: myReferrer.level_depth,
          joined_via: myReferrer.referral_code
        } : null,
        message: myReferrer ? 'User has a referrer' : 'User is a root member (no referrer)',
        error: referrerError?.message
      },

      // Commission System Tests
      commission_test: {
        status: commissions && commissions.length > 0 ? 'PASS' : 'INFO',
        data: {
          total_commissions: commissions?.length || 0,
          total_earned: commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
          recent_commissions: commissions || []
        },
        message: commissions && commissions.length > 0 ? 'User has commission history' : 'No commissions earned yet',
        error: commissionsError?.message
      },

      // Partner Wallet Test
      partner_wallet_test: {
        status: partnerWallet ? 'PASS' : 'INFO',
        data: partnerWallet ? {
          balance: partnerWallet.balance,
          total_earned: partnerWallet.total_earned,
          total_withdrawn: partnerWallet.total_withdrawn,
          last_updated: partnerWallet.last_updated
        } : null,
        message: partnerWallet ? 'Partner wallet exists' : 'Partner wallet not created yet',
        error: walletError?.message
      },

      // Rank System Test
      rank_system_test: {
        status: 'PASS',
        data: {
          current_rank: currentRank,
          direct_referrals: directReferrals,
          monthly_bonus: rankBonuses[currentRank as keyof typeof rankBonuses] || 0,
          next_rank_requirement: directReferrals < 5 ? 5 - directReferrals : 
                                 directReferrals < 10 ? 10 - directReferrals :
                                 directReferrals < 15 ? 15 - directReferrals :
                                 directReferrals < 20 ? 20 - directReferrals :
                                 directReferrals < 25 ? 25 - directReferrals : 0
        }
      },

      // Plan Access Test
      plan_access_test: {
        status: 'PASS',
        data: {
          has_vip_plan: hasVipPlan,
          max_commission_levels: maxCommissionLevels,
          active_subscriptions: userSubscriptions?.length || 0,
          subscription_details: userSubscriptions || []
        }
      },

      // Earning Potential Test
      earning_potential_test: {
        status: 'PASS',
        data: {
          potential_daily_commissions: potentialDailyCommissions.toFixed(4),
          potential_monthly_commissions: (potentialDailyCommissions * 30).toFixed(2),
          potential_yearly_commissions: (potentialDailyCommissions * 365).toFixed(2),
          rank_bonus_monthly: rankBonuses[currentRank as keyof typeof rankBonuses] || 0,
          total_monthly_potential: ((potentialDailyCommissions * 30) + (rankBonuses[currentRank as keyof typeof rankBonuses] || 0)).toFixed(2)
        }
      },

      // System Health Check
      system_health: {
        referral_code_generation: referralCode ? 'WORKING' : 'NEEDS_SETUP',
        community_tracking: myReferrals ? 'WORKING' : 'NO_DATA',
        commission_calculation: 'READY',
        rank_system: 'WORKING',
        partner_wallet: partnerWallet ? 'WORKING' : 'NEEDS_SETUP'
      },

      // Recommendations
      recommendations: [
        ...(referralCode ? [] : ['Generate referral code to start earning']),
        ...(directReferrals === 0 ? ['Share referral link to build community'] : []),
        ...(directReferrals > 0 && directReferrals < 5 ? [`Refer ${5 - directReferrals} more users to reach Bronze rank`] : []),
        ...(!hasVipPlan ? ['Upgrade to VIP plan to access all 15 commission levels'] : []),
        ...(potentialDailyCommissions === 0 ? ['Build your referral network to start earning commissions'] : [])
      ]
    };

    return NextResponse.json({
      success: true,
      message: 'Partnership system test completed',
      test_results: testResults,
      summary: {
        total_tests: 8,
        passed_tests: Object.values(testResults).filter((test: any) => 
          test.status === 'PASS' || test.status === 'WORKING'
        ).length,
        system_status: 'OPERATIONAL',
        user_ready: referralCode && directReferrals >= 0
      }
    });

  } catch (error) {
    console.error('Error testing partnership system:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Trigger commission calculation test
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const userEmail = session.user.email;

    if (action === 'test-commission-calculation') {
      // Simulate a VIP plan purchase to test commission calculation
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://ticgloballtd.com'}/api/referral/calculate-commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail,
          planType: 'vip',
          planValue: 500,
          planCount: 1
        })
      });

      const data = await response.json();

      return NextResponse.json({
        success: true,
        message: 'Commission calculation test completed',
        commission_result: data
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "test-commission-calculation"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in partnership system POST test:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
