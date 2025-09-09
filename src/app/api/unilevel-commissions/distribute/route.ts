import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Distribute daily unilevel commissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, userEmail } = body;
    
    // Use provided date or current date
    const distributionDate = date || new Date().toISOString().split('T')[0];

    console.log(`🚀 Starting daily unilevel commission distribution for ${distributionDate}`);

    // If userEmail is provided, calculate for specific user only (for testing)
    if (userEmail) {
      return await distributeForSingleUser(userEmail, distributionDate);
    }

    // Distribute for all users
    const { data, error } = await supabaseAdmin
      .rpc('calculate_daily_unilevel_commissions', {
        distribution_date_param: distributionDate
      });

    if (error) {
      console.error('Error in daily commission distribution:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to distribute commissions'
      }, { status: 500 });
    }

    const result = data[0];
    
    console.log(`✅ Daily commission distribution completed:`);
    console.log(`   📊 Processed: ${result.processed_users} users`);
    console.log(`   ✅ Successful: ${result.successful_distributions} distributions`);
    console.log(`   ❌ Failed: ${result.failed_distributions} distributions`);
    console.log(`   💰 Total distributed: $${parseFloat(result.total_commissions_distributed).toFixed(4)}`);

    return NextResponse.json({
      success: true,
      message: `Daily unilevel commissions distributed for ${distributionDate}`,
      data: {
        date: distributionDate,
        processed_users: result.processed_users,
        successful_distributions: result.successful_distributions,
        failed_distributions: result.failed_distributions,
        total_commissions_distributed: parseFloat(result.total_commissions_distributed),
        distribution_type: 'all_users'
      }
    });

  } catch (error) {
    console.error('❌ Critical error in unilevel commission distribution:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during commission distribution',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to distribute commissions for a single user (testing)
async function distributeForSingleUser(userEmail: string, distributionDate: string) {
  try {
    // Get user's referral network with levels
    const { data: referralNetwork, error: networkError } = await supabaseAdmin
      .rpc('get_user_referral_network', {
        user_email_param: userEmail
      });

    if (networkError) {
      console.error('Error fetching referral network:', networkError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch referral network'
      }, { status: 500 });
    }

    // Check user's plan type
    const { data: userPlans, error: planError } = await supabaseAdmin
      .from('user_plan_subscriptions')
      .select(`
        *,
        payment_plans!inner(name, plan_id)
      `)
      .eq('user_email', userEmail)
      .eq('status', 'active');

    if (planError) {
      console.error('Error fetching user plans:', planError);
    }

    const hasVipPlan = userPlans?.some(plan => 
      plan.payment_plans.name.toLowerCase().includes('vip')
    ) || false;

    const maxLevel = hasVipPlan ? 15 : 1;
    let totalCommission = 0;
    let distributionCount = 0;

    // Process each referral in network
    for (const referral of referralNetwork || []) {
      if (referral.level > maxLevel) continue;

      // Get VIP account count for this referral
      const { data: referralPlans, error: referralPlanError } = await supabaseAdmin
        .from('user_plan_subscriptions')
        .select(`
          *,
          payment_plans!inner(name)
        `)
        .eq('user_email', referral.referred_email)
        .eq('status', 'active');

      if (referralPlanError) continue;

      const vipAccountCount = referralPlans?.filter(plan => 
        plan.payment_plans.name.toLowerCase().includes('vip')
      ).length || 0;

      if (vipAccountCount === 0) continue;

      // Calculate commission
      const commissionRate = getCommissionRate(referral.level);
      const dailyCommission = 0.44 * commissionRate * vipAccountCount;

      if (dailyCommission > 0) {
        // Add to partner wallet
        const { error: commissionError } = await supabaseAdmin
          .rpc('add_commission_earning', {
            referrer_email_param: userEmail,
            referred_email_param: referral.referred_email,
            commission_type_param: 'unilevel_daily',
            commission_amount_param: dailyCommission,
            commission_rate_param: commissionRate,
            source_transaction_id_param: null,
            source_amount_param: 0.44 * vipAccountCount,
            description_param: `Level ${referral.level} Daily Commission (${vipAccountCount} VIP accounts)`
          });

        if (!commissionError) {
          totalCommission += dailyCommission;
          distributionCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily commissions distributed for ${userEmail}`,
      data: {
        user_email: userEmail,
        date: distributionDate,
        max_level: maxLevel,
        plan_type: hasVipPlan ? 'VIP' : 'Starter',
        distributions: distributionCount,
        total_commission: totalCommission,
        distribution_type: 'single_user'
      }
    });

  } catch (error) {
    console.error('Error in single user distribution:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to distribute commissions for user'
    }, { status: 500 });
  }
}

// Helper function to get commission rate by level
function getCommissionRate(level: number): number {
  if (level === 1) return 0.10;        // Level 1: 10%
  if (level >= 2 && level <= 6) return 0.05;   // Levels 2-6: 5%
  if (level >= 7 && level <= 10) return 0.025; // Levels 7-10: 2.5%
  if (level >= 11 && level <= 15) return 0.01; // Levels 11-15: 1%
  return 0; // No commission beyond level 15
}

// GET - Get commission distribution status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const userEmail = searchParams.get('userEmail');

    let query = supabaseAdmin
      .from('unilevel_commissions')
      .select('*')
      .eq('distribution_date', date)
      .order('created_at', { ascending: false });

    if (userEmail) {
      query = query.eq('referrer_email', userEmail);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commission history:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch commission history'
      }, { status: 500 });
    }

    // Calculate summary
    const summary = {
      date,
      total_commissions: commissions?.length || 0,
      total_amount: commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.daily_commission), 0) || 0,
      by_status: {
        pending: commissions?.filter((c: any) => c.status === 'pending').length || 0,
        distributed: commissions?.filter((c: any) => c.status === 'distributed').length || 0,
        failed: commissions?.filter((c: any) => c.status === 'failed').length || 0
      },
      by_level: {} as Record<string, { count: number; amount: number }>
    };

    // Group by level
    commissions?.forEach((c: any) => {
      const level = `level_${c.referrer_level}`;
      if (!summary.by_level[level]) {
        summary.by_level[level] = { count: 0, amount: 0 };
      }
      summary.by_level[level].count++;
      summary.by_level[level].amount += parseFloat(c.daily_commission);
    });

    return NextResponse.json({
      success: true,
      data: {
        summary,
        commissions: commissions || []
      }
    });

  } catch (error) {
    console.error('Error in commission history API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
