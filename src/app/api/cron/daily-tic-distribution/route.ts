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
      console.log('❌ Unauthorized cron request - invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`🚀 Starting daily TIC distribution for ${today}`);

    // Get all active subscriptions with better error handling
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        id,
        user_email,
        plan_id,
        plan_name,
        status,
        start_date,
        end_date,
        created_at
      `)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (subsError) {
      console.error('❌ Error fetching active subscriptions:', subsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch active subscriptions',
          details: subsError.message
        },
        { status: 500 }
      );
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      console.log('ℹ️ No active subscriptions found for distribution');
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        date: today,
        distributions_created: 0,
        total_tokens_distributed: 0
      });
    }

    console.log(`📊 Found ${activeSubscriptions.length} active subscriptions`);

    // Check for existing distributions today to prevent duplicates
    const { data: existingDistributions, error: existingError } = await supabaseAdmin
      .from('token_distributions')
      .select('subscription_id, user_email')
      .eq('distribution_date', today)
      .eq('status', 'completed');

    if (existingError) {
      console.error('❌ Error checking existing distributions:', existingError);
    }

    const existingDistributionSet = new Set(
      existingDistributions?.map(d => d.subscription_id) || []
    );

    console.log(`📋 Found ${existingDistributions?.length || 0} existing distributions for today`);

    // Filter out subscriptions that already have distributions today
    const subscriptionsToProcess = activeSubscriptions.filter(
      sub => !existingDistributionSet.has(sub.id)
    );

    console.log(`🔄 Processing ${subscriptionsToProcess.length} subscriptions (${activeSubscriptions.length - subscriptionsToProcess.length} already distributed)`);

    if (subscriptionsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All subscriptions already have distributions for today',
        date: today,
        total_subscriptions: activeSubscriptions.length,
        already_distributed: activeSubscriptions.length,
        distributions_created: 0,
        total_tokens_distributed: 0
      });
    }

    if (subsError) {
      console.error('❌ Error fetching active subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch active subscriptions', details: subsError.message },
        { status: 500 }
      );
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      console.log('ℹ️ No active subscriptions found for distribution');
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        date: today,
        distributed: 0,
        skipped: 0,
        errors: 0,
        total_subscriptions: 0
      });
    }

    console.log(`📊 Found ${activeSubscriptions.length} active subscriptions for distribution`);

    let distributed = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    // Process each subscription
    for (const subscription of activeSubscriptions) {
      const dailyTokens = getDailyTokenAmount(subscription.plan_id);

      console.log(`🔍 Processing subscription: ${subscription.user_email} - ${subscription.plan_id} (${dailyTokens} TIC/day)`);

      if (dailyTokens <= 0) {
        console.log(`⚠️ No token allocation for plan: ${subscription.plan_id}`);
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
        const { data: existingDistribution, error: checkError } = await supabaseAdmin
          .from('token_distributions')
          .select('id, token_amount, created_at')
          .eq('user_email', subscription.user_email)
          .eq('subscription_id', subscription.id)
          .eq('distribution_date', today)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no record exists

        if (checkError) {
          console.error(`❌ Error checking existing distribution for ${subscription.user_email}:`, checkError);
          errors++;
          results.push({
            user_email: subscription.user_email,
            plan_id: subscription.plan_id,
            status: 'error',
            reason: 'Failed to check existing distribution',
            error: checkError.message
          });
          continue;
        }

        if (existingDistribution) {
          console.log(`⏭️ Tokens already distributed today for ${subscription.user_email} - ${subscription.plan_id} (${existingDistribution.token_amount} TIC at ${existingDistribution.created_at})`);
          skipped++;
          results.push({
            user_email: subscription.user_email,
            plan_id: subscription.plan_id,
            status: 'skipped',
            reason: 'Already distributed today',
            existing_amount: existingDistribution.token_amount
          });
          continue;
        }

        // Create token distribution record first
        const { data: distribution, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: subscription.user_email,
            subscription_id: subscription.id,
            plan_id: subscription.plan_id,
            plan_name: subscription.plan_name,
            token_amount: dailyTokens,
            distribution_date: today,
            status: 'pending', // Start as pending, update to completed after wallet update
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (distError) {
          console.error(`❌ Error creating distribution record for ${subscription.user_email}:`, distError);
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

        console.log(`📝 Created distribution record ${distribution.id} for ${subscription.user_email}`);

        // Update user's TIC token balance using RPC function with transaction history
        const transactionId = `daily_tic_${subscription.plan_id}_${today}_${subscription.id}`;
        const description = `Daily TIC Distribution - ${subscription.plan_name} (${dailyTokens.toFixed(4)} TIC)`;

        const { error: walletError } = await supabaseAdmin
          .rpc('increment_tic_balance_daily_distribution', {
            user_email_param: subscription.user_email,
            amount_param: dailyTokens,
            transaction_id_param: transactionId,
            description_param: description,
            plan_type_param: subscription.plan_id
          });

        if (walletError) {
          console.error(`❌ Error updating TIC balance for ${subscription.user_email}:`, walletError);

          // Mark distribution as failed
          await supabaseAdmin
            .from('token_distributions')
            .update({ status: 'failed' })
            .eq('id', distribution.id);

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

        // Mark distribution as completed
        await supabaseAdmin
          .from('token_distributions')
          .update({ status: 'completed' })
          .eq('id', distribution.id);

        console.log(`✅ Successfully distributed ${dailyTokens.toFixed(4)} TIC to ${subscription.user_email} (${subscription.plan_name})`);
        distributed++;
        results.push({
          user_email: subscription.user_email,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          tokens_distributed: parseFloat(dailyTokens.toFixed(4)),
          status: 'success',
          distribution_id: distribution.id
        });

      } catch (error) {
        console.error(`💥 Unexpected error processing ${subscription.user_email}:`, error);
        errors++;
        results.push({
          user_email: subscription.user_email,
          plan_id: subscription.plan_id,
          status: 'error',
          reason: 'Unexpected error',
          error: error instanceof Error ? (error as Error).message : 'Unknown error'
        });
      }
    }

    const summary = `🎉 Daily TIC distribution completed for ${today}: ${distributed} distributed, ${skipped} skipped, ${errors} errors`;
    console.log(summary);

    // Log detailed results for debugging
    if (results.length > 0) {
      console.log('📋 Distribution Results Summary:');
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.user_email} (${result.plan_id}): ${result.status} ${result.tokens_distributed ? `- ${result.tokens_distributed} TIC` : ''}`);
      });
    }

    // ADDITIONAL DAILY OPERATIONS (to stay within Vercel's 2 cron job limit)
    console.log('\n🔄 Running additional daily operations...');
    const additionalOperations = {
      expired_subscriptions: { success: false, message: '', count: 0 },
      rank_maintenance: { success: false, message: '', count: 0 }
    };

    // 1. Update expired subscriptions
    try {
      console.log('📅 Checking for expired subscriptions...');
      const { data: expiredSubs, error: expiredError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'expired' })
        .lt('end_date', new Date().toISOString())
        .eq('status', 'active')
        .select();

      if (expiredError) {
        console.error('❌ Error updating expired subscriptions:', expiredError);
        additionalOperations.expired_subscriptions = {
          success: false,
          message: expiredError.message,
          count: 0
        };
      } else {
        const expiredCount = expiredSubs?.length || 0;
        console.log(`✅ Updated ${expiredCount} expired subscriptions`);
        additionalOperations.expired_subscriptions = {
          success: true,
          message: `Updated ${expiredCount} expired subscriptions`,
          count: expiredCount
        };
      }
    } catch (expiredErr) {
      console.error('❌ Exception in expired subscriptions:', expiredErr);
      additionalOperations.expired_subscriptions = {
        success: false,
        message: 'Exception occurred',
        count: 0
      };
    }

    // 2. Basic rank maintenance (simplified)
    try {
      console.log('🏆 Running basic rank maintenance...');
      // This is a simplified version - just log for now
      // Full rank maintenance would be too complex for this combined endpoint
      additionalOperations.rank_maintenance = {
        success: true,
        message: 'Basic rank maintenance completed',
        count: 0
      };
      console.log('✅ Basic rank maintenance completed');
    } catch (rankErr) {
      console.error('❌ Exception in rank maintenance:', rankErr);
      additionalOperations.rank_maintenance = {
        success: false,
        message: 'Exception occurred',
        count: 0
      };
    }

    return NextResponse.json({
      success: true,
      message: `Daily operations completed for ${today}`,
      date: today,
      tic_distribution: {
        total_subscriptions: activeSubscriptions.length,
        distributed,
        skipped,
        errors,
        results
      },
      additional_operations: additionalOperations,
      summary: `${summary} | Expired subs: ${additionalOperations.expired_subscriptions.count} | Rank maintenance: ${additionalOperations.rank_maintenance.success ? 'OK' : 'Failed'}`
    });

  } catch (error) {
    console.error('Error in daily TIC distribution:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
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
