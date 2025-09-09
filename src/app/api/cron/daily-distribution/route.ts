import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Token allocation per plan (yearly amounts) - ONLY TIC TOKENS
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
};

// Calculate daily TIC token amount (yearly amount / 365 days)
const getDailyTicAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // Exact value without rounding
};

// POST - Run daily TIC distribution for all active users
export async function POST(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`🚀 Starting daily TIC distribution for ${today}`);

    // Get all active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    if (subsError) {
      console.error('Error fetching active subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch active subscriptions' },
        { status: 500 }
      );
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        date: today,
        totalSubscriptions: 0,
        results: []
      });
    }

    console.log(`📊 Found ${activeSubscriptions.length} active subscriptions`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const subscription of activeSubscriptions) {
      const userEmail = subscription.user_email;
      const planId = subscription.plan_id;
      const planName = subscription.plan_name;

      console.log(`🔄 Processing ${userEmail} - ${planName}`);

      try {
        // Distribute TIC tokens only (GIC is earned from ranking bonuses, not daily distribution)
        const dailyTicTokens = getDailyTicAmount(planId);
        if (dailyTicTokens > 0) {
          // Check if TIC already distributed today
          const { data: existingTicDist } = await supabaseAdmin
            .from('token_distributions')
            .select('id')
            .eq('user_email', userEmail)
            .eq('subscription_id', subscription.id)
            .eq('distribution_date', today)
            .single();

          if (!existingTicDist) {
            // Create TIC distribution record
            const { error: ticDistError } = await supabaseAdmin
              .from('token_distributions')
              .insert({
                user_email: userEmail,
                subscription_id: subscription.id,
                plan_id: planId,
                plan_name: planName,
                token_amount: dailyTicTokens,
                distribution_date: today,
                status: 'completed',
                created_at: new Date().toISOString()
              });

            if (!ticDistError) {
              // Update TIC balance
              const transactionId = `daily_tic_${planId}_${today}_${subscription.id}`;
              const { error: ticBalanceError } = await supabaseAdmin
                .rpc('increment_tic_balance_daily_distribution', {
                  user_email_param: userEmail,
                  amount_param: dailyTicTokens,
                  transaction_id_param: transactionId,
                  description_param: `Daily TIC Distribution - ${planName} (${dailyTicTokens} TIC)`,
                  plan_type_param: planId
                });

              if (ticBalanceError) {
                console.error(`❌ TIC balance update failed for ${userEmail}:`, ticBalanceError);
              } else {
                console.log(`✅ TIC distributed: ${dailyTicTokens} TIC to ${userEmail}`);
              }
            }
          }
        }

        // Note: GIC tokens are NOT distributed daily
        // GIC is earned from:
        // - Monthly ranking bonuses (50% TIC + 50% GIC split)
        // - Achievement rewards when reaching Bronze, Silver, Gold, Platinum ranks
        // - NOT from daily plan distributions

        // Note: Partner commissions are NOT distributed here
        // Partner commissions come from:
        // - Daily unilevel commissions ($0.44 per VIP account per day)
        // - Handled by separate cron job: /api/cron/daily-unilevel-commissions
        // - NOT from plan purchases

        results.push({
          userEmail,
          planId,
          planName,
          ticDistributed: dailyTicTokens,
          status: 'success'
        });

        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${userEmail}:`, error);
        results.push({
          userEmail,
          planId,
          planName,
          status: 'error',
          error: error instanceof Error ? (error as Error).message : 'Unknown error'
        });
        errorCount++;
      }
    }

    console.log(`🎉 Daily distribution completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Daily TIC distribution completed for ${today}`,
      date: today,
      totalSubscriptions: activeSubscriptions.length,
      successCount,
      errorCount,
      results,
      summary: {
        totalTicDistributed: results.reduce((sum, r) => sum + (r.ticDistributed || 0), 0),
        uniqueUsers: new Set(results.map(r => r.userEmail)).size
      },
      note: 'GIC tokens are earned from ranking bonuses, not daily distribution. Partner commissions are handled by unilevel commission system.'
    });

  } catch (error) {
    console.error('Error in daily distribution:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check TIC distribution status for today
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's TIC distributions only
    const { data: ticDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('distribution_date', today);

    return NextResponse.json({
      date: today,
      ticDistributions: ticDistributions || [],
      totalTicDistributions: ticDistributions?.length || 0,
      uniqueUsers: new Set((ticDistributions || []).map(d => d.user_email)).size,
      totalTicAmount: (ticDistributions || []).reduce((sum, d) => sum + parseFloat(d.token_amount), 0),
      note: 'This endpoint only handles TIC distribution. GIC is earned from ranking bonuses. Partner commissions are handled by unilevel system.'
    });

  } catch (error) {
    console.error('Error checking distribution status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
