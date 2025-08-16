import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Token allocation per plan (yearly amounts)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
};

// Calculate daily token amount (yearly amount / 365 days)
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // Exact value without rounding
};

// POST - Daily TIC token distribution (called by cron job)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

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
      console.log('No active subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        distributed: 0,
        skipped: 0,
        errors: 0
      });
    }

    console.log(`Found ${activeSubscriptions.length} active subscriptions`);

    let distributed = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    for (const subscription of activeSubscriptions) {
      const dailyTokens = getDailyTokenAmount(subscription.plan_id);
      
      if (dailyTokens <= 0) {
        console.log(`No token allocation for plan: ${subscription.plan_id}`);
        skipped++;
        results.push({
          user_email: subscription.user_email,
          plan_id: subscription.plan_id,
          status: 'skipped',
          reason: 'No token allocation for plan'
        });
        continue;
      }

      try {
        // Check if tokens were already distributed today for this subscription
        const { data: existingDistribution } = await supabaseAdmin
          .from('token_distributions')
          .select('id')
          .eq('user_email', subscription.user_email)
          .eq('subscription_id', subscription.id)
          .eq('distribution_date', today)
          .single();

        if (existingDistribution) {
          console.log(`Tokens already distributed today for ${subscription.user_email} - ${subscription.plan_id}`);
          skipped++;
          results.push({
            user_email: subscription.user_email,
            plan_id: subscription.plan_id,
            status: 'skipped',
            reason: 'Already distributed today'
          });
          continue;
        }

        // Create token distribution record
        const { data: distribution, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: subscription.user_email,
            subscription_id: subscription.id,
            plan_id: subscription.plan_id,
            plan_name: subscription.plan_name,
            token_amount: dailyTokens,
            distribution_date: today,
            status: 'completed',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (distError) {
          console.error(`Error creating distribution record for ${subscription.user_email}:`, distError);
          errors++;
          results.push({
            user_email: subscription.user_email,
            plan_id: subscription.plan_id,
            status: 'error',
            reason: 'Failed to create distribution record',
            error: distError.message
          });
          continue;
        }

        // Update user's TIC token balance using RPC function with transaction history
        const transactionId = `daily_tic_${subscription.plan_id}_${today}_${subscription.id}`;
        const description = `Daily TIC Distribution - ${subscription.plan_name} (${dailyTokens} TIC)`;

        const { error: walletError } = await supabaseAdmin
          .rpc('increment_tic_balance_daily_distribution', {
            user_email_param: subscription.user_email,
            amount_param: dailyTokens,
            transaction_id_param: transactionId,
            description_param: description,
            plan_type_param: subscription.plan_id
          });

        if (walletError) {
          console.error(`Error updating TIC balance for ${subscription.user_email}:`, walletError);
          errors++;
          results.push({
            user_email: subscription.user_email,
            plan_id: subscription.plan_id,
            status: 'error',
            reason: 'Failed to update TIC balance',
            error: walletError.message
          });
          continue;
        }

        console.log(`✅ Distributed ${dailyTokens} TIC to ${subscription.user_email} (${subscription.plan_name})`);
        distributed++;
        results.push({
          user_email: subscription.user_email,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          tokens_distributed: dailyTokens,
          status: 'success'
        });

      } catch (error) {
        console.error(`Unexpected error processing ${subscription.user_email}:`, error);
        errors++;
        results.push({
          user_email: subscription.user_email,
          plan_id: subscription.plan_id,
          status: 'error',
          reason: 'Unexpected error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 Daily TIC distribution completed: ${distributed} distributed, ${skipped} skipped, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Daily TIC distribution completed for ${today}`,
      date: today,
      total_subscriptions: activeSubscriptions.length,
      distributed,
      skipped,
      errors,
      results
    });

  } catch (error) {
    console.error('Error in daily TIC distribution:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check distribution status for today
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's distributions
    const { data: distributions, error } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('distribution_date', today)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching distributions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch distributions' },
        { status: 500 }
      );
    }

    // Get active subscriptions count
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    const totalActive = activeSubscriptions?.length || 0;
    const totalDistributed = distributions?.length || 0;

    return NextResponse.json({
      date: today,
      total_active_subscriptions: totalActive,
      total_distributed: totalDistributed,
      pending: Math.max(0, totalActive - totalDistributed),
      distributions: distributions || []
    });

  } catch (error) {
    console.error('Error checking distribution status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
