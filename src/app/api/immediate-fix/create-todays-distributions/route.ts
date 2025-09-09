import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Token allocation per plan (yearly amounts)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
} as const;

// Calculate daily token amount (yearly amount / 365 days)
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365;
};

// POST - Immediately create today's distributions for ALL users
export async function POST(request: NextRequest) {
  // DISABLED: This API is disabled to prevent duplicate distributions
  return NextResponse.json({
    error: 'This API is disabled to prevent duplicate distributions',
    message: 'Use /api/cron/daily-tic-distribution instead',
    status: 'disabled'
  }, { status: 410 });

  try {
    console.log('🚀 IMMEDIATE FIX: Creating today\'s TIC distributions for ALL users...');

    // Get TODAY'S date (current date)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log(`📅 Creating distributions for TODAY: ${today} (Current time: ${now.toISOString()})`);

    // Get ALL active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', now.toISOString());

    if (subsError) {
      console.error('❌ Error fetching active subscriptions:', subsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch active subscriptions',
        details: subsError?.message || 'Unknown error'
      }, { status: 500 });
    }

    if (!activeSubscriptions || activeSubscriptions?.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        date: today,
        users_processed: 0,
        distributions_created: 0
      });
    }

    console.log(`👥 Found ${activeSubscriptions?.length || 0} active subscriptions`);

    // Delete ALL existing distributions for today to start fresh
    console.log('🗑️ Cleaning existing distributions for today...');
    const { error: deleteError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .eq('distribution_date', today);

    if (deleteError) {
      console.error('⚠️ Error deleting existing distributions:', deleteError);
      // Continue anyway
    }

    // Group subscriptions by user email
    const subscriptionsByUser = (activeSubscriptions || []).reduce((acc: any, sub: any) => {
      if (!acc[sub.user_email]) {
        acc[sub.user_email] = [];
      }
      acc[sub.user_email].push(sub);
      return acc;
    }, {});

    const userEmails = Object.keys(subscriptionsByUser);
    console.log(`👤 Processing ${userEmails.length} unique users`);

    let distributionsCreated = 0;
    const results = [];

    // Process each user
    for (const userEmail of userEmails) {
      try {
        const userSubscriptions = subscriptionsByUser[userEmail];
        console.log(`👤 Processing user: ${userEmail} (${userSubscriptions.length} subscriptions)`);

        // Calculate total daily tokens for ALL user's active subscriptions
        let totalDailyTokens = 0;
        const planNames: string[] = [];

        for (const subscription of userSubscriptions) {
          const dailyTokens = getDailyTokenAmount(subscription.plan_id);
          if (dailyTokens > 0) {
            totalDailyTokens += dailyTokens;
            if (!planNames.includes(subscription.plan_name)) {
              planNames.push(subscription.plan_name);
            }
          }
        }

        if (totalDailyTokens <= 0) {
          console.log(`⚠️ Skipping ${userEmail} - no token allocation`);
          continue;
        }

        // Use the primary subscription for the distribution record
        const primarySubscription = userSubscriptions[0];

        // Create TODAY'S distribution
        const distributionTime = new Date();
        distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

        const { data: distribution, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: userEmail,
            subscription_id: primarySubscription.id,
            plan_id: primarySubscription.plan_id,
            plan_name: planNames.length > 1 ? planNames.join(' + ') : planNames[0],
            token_amount: totalDailyTokens,
            distribution_date: today, // TODAY'S DATE
            status: 'completed',
            created_at: distributionTime.toISOString()
          })
          .select()
          .single();

        if (distError) {
          console.error(`❌ Error creating distribution for ${userEmail}:`, distError);
          results.push({
            user_email: userEmail,
            status: 'error',
            error: distError?.message || 'Unknown error'
          });
        } else {
          console.log(`✅ Created TODAY'S distribution for ${userEmail}: ${totalDailyTokens.toFixed(4)} TIC`);
          distributionsCreated++;
          
          // Update user's wallet balance
          try {
            await supabaseAdmin.rpc('increment_tic_balance_daily_distribution', {
              p_user_email: userEmail,
              p_amount: totalDailyTokens
            });
            console.log(`💰 Updated wallet balance for ${userEmail}`);
          } catch (walletError) {
            console.error(`⚠️ Wallet update failed for ${userEmail}:`, walletError);
          }

          results.push({
            user_email: userEmail,
            status: 'success',
            tokens_distributed: totalDailyTokens,
            plans: planNames.join(' + '),
            distribution_date: today
          });
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${userEmail}:`, userError);
        results.push({
          user_email: userEmail,
          status: 'error',
          error: userError instanceof Error ? (userError as Error).message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 IMMEDIATE FIX COMPLETED! Created ${distributionsCreated} distributions for TODAY (${today})`);

    return NextResponse.json({
      success: true,
      message: `IMMEDIATE FIX: Created ${distributionsCreated} distributions for TODAY`,
      date: today,
      current_time: now.toISOString(),
      total_active_subscriptions: activeSubscriptions?.length || 0,
      unique_users: userEmails.length,
      distributions_created: distributionsCreated,
      results: results.slice(0, 20) // Show first 20 results
    });

  } catch (error) {
    console.error('❌ IMMEDIATE FIX ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'IMMEDIATE FIX failed',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check current distribution status
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Get count of active subscriptions
    const { count: activeSubsCount } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('end_date', now.toISOString());

    // Get count of today's distributions
    const { count: todayDistCount } = await supabaseAdmin
      .from('token_distributions')
      .select('*', { count: 'exact', head: true })
      .eq('distribution_date', today);

    // Get sample of today's distributions
    const { data: todayDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, plan_id, token_amount, distribution_date, created_at')
      .eq('distribution_date', today)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      current_time: now.toISOString(),
      date: today,
      active_subscriptions: activeSubsCount || 0,
      todays_distributions: todayDistCount || 0,
      needs_immediate_fix: (todayDistCount || 0) === 0,
      sample_distributions: todayDistributions || [],
      recommendation: (todayDistCount || 0) === 0 
        ? 'Run immediate fix to create today\'s distributions'
        : 'All users have today\'s distributions'
    });

  } catch (error) {
    console.error('Error checking immediate fix status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check status',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
