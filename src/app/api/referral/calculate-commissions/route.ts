import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Commission rates
const COMMISSION_RATES = {
  1: 0.10, // 10% for 1st level
  2: 0.05  // 5% for 2nd level
};

const DAILY_EARNINGS_PER_VIP_PLAN = 0.44; // Daily earnings per VIP plan (138 USD equivalent)

export async function POST(request: NextRequest) {
  try {
    const { userEmail, planType, planValue, planCount } = await request.json();

    if (!userEmail || !planType || !planValue || !planCount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const supabase = createClient();

    // Only calculate commissions for VIP plans
    if (planType !== 'vip') {
      return NextResponse.json({
        success: true,
        message: 'No commissions calculated for non-VIP plans',
        commissionsCreated: 0
      });
    }

    // Get the user's referrer chain
    const { data: referrerChain, error: chainError } = await supabase
      .from('referral_relationships')
      .select('referrer_email, level_depth')
      .eq('referred_email', userEmail)
      .eq('is_active', true)
      .order('level_depth');

    if (chainError) {
      console.error('Error fetching referrer chain:', chainError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch referrer chain'
      }, { status: 500 });
    }

    if (!referrerChain || referrerChain.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No referrers found for this user',
        commissionsCreated: 0
      });
    }

    const commissionsCreated = [];

    // Calculate commissions for each level (only 1st and 2nd level)
    for (const referrer of referrerChain) {
      const level = referrer.level_depth;
      
      // Only calculate for levels 1 and 2
      if (level > 2) continue;

      const commissionRate = COMMISSION_RATES[level as keyof typeof COMMISSION_RATES];
      if (!commissionRate) continue;

      // Calculate daily commission amount
      const dailyCommissionPerPlan = DAILY_EARNINGS_PER_VIP_PLAN * commissionRate;
      const totalDailyCommission = dailyCommissionPerPlan * planCount;

      // Create commission record
      const { data: commission, error: commissionError } = await supabase
        .from('referral_commissions')
        .insert({
          earner_email: referrer.referrer_email,
          referral_email: userEmail,
          commission_level: level,
          commission_rate: commissionRate * 100, // Store as percentage
          base_earnings: DAILY_EARNINGS_PER_VIP_PLAN,
          commission_amount: totalDailyCommission,
          plan_type: planType,
          calculation_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (commissionError) {
        console.error(`Error creating commission for level ${level}:`, commissionError);
        continue;
      }

      commissionsCreated.push({
        level,
        referrerEmail: referrer.referrer_email,
        commissionAmount: totalDailyCommission,
        commissionRate: commissionRate * 100
      });

      // Update referrer's total earnings
      const { error: updateError } = await supabase
        .rpc('update_referral_earnings', {
          user_email_param: referrer.referrer_email,
          amount_param: totalDailyCommission
        });

      if (updateError) {
        console.error('Error updating referrer earnings:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Calculated commissions for ${commissionsCreated.length} referrers`,
      commissionsCreated,
      totalCommissions: commissionsCreated.reduce((sum, c) => sum + c.commissionAmount, 0)
    });

  } catch (error) {
    console.error('Error calculating commissions:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// GET endpoint to manually trigger commission calculation for all active VIP plans
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get all active VIP plans
    const { data: activePlans, error: plansError } = await supabase
      .from('user_plans')
      .select('user_email, plan_type, plan_count, plan_value')
      .eq('is_active', true)
      .eq('plan_type', 'vip');

    if (plansError) {
      console.error('Error fetching active plans:', plansError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch active plans'
      }, { status: 500 });
    }

    let totalCommissionsCalculated = 0;
    const results = [];

    // Calculate daily commissions for each active VIP plan
    for (const plan of activePlans || []) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/referral/calculate-commissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: plan.user_email,
            planType: plan.plan_type,
            planValue: plan.plan_value,
            planCount: plan.plan_count
          })
        });

        const result = await response.json();
        if (result.success) {
          totalCommissionsCalculated += result.commissionsCreated?.length || 0;
          results.push({
            userEmail: plan.user_email,
            commissionsCreated: result.commissionsCreated?.length || 0
          });
        }
      } catch (error) {
        console.error(`Error calculating commissions for ${plan.user_email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily commission calculation completed`,
      totalPlansProcessed: activePlans?.length || 0,
      totalCommissionsCalculated,
      results
    });

  } catch (error) {
    console.error('Error in daily commission calculation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
