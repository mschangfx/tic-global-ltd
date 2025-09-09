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

// AUTO-FIX: Ensure all users have current distributions
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 AUTO-FIX: Ensuring all users have current TIC distributions...');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);

    // Get all active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active');

    if (subsError) {
      console.error('❌ Error fetching active subscriptions:', subsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch active subscriptions',
        details: subsError.message
      }, { status: 500 });
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        users_processed: 0,
        distributions_created: 0
      });
    }

    console.log(`👥 Found ${activeSubscriptions.length} active subscriptions`);

    // Check which users are missing today's distribution
    const userEmails = Array.from(new Set(activeSubscriptions.map(sub => sub.user_email)));
    const usersNeedingDistribution = [];

    for (const userEmail of userEmails) {
      // Check if user already has distribution for today
      const { data: todayDistribution } = await supabaseAdmin
        .from('token_distributions')
        .select('id')
        .eq('user_email', userEmail)
        .eq('distribution_date', today)
        .limit(1);

      if (!todayDistribution || todayDistribution.length === 0) {
        // Get user's active subscriptions
        const userSubscriptions = activeSubscriptions.filter(sub => sub.user_email === userEmail);
        usersNeedingDistribution.push({
          userEmail,
          subscriptions: userSubscriptions
        });
      }
    }

    console.log(`🔧 ${usersNeedingDistribution.length} users need today's distribution`);

    if (usersNeedingDistribution.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already have today\'s distributions',
        date: today,
        users_processed: 0,
        distributions_created: 0
      });
    }

    // Create today's distributions for users who need them
    let distributionsCreated = 0;
    const results = [];

    for (const user of usersNeedingDistribution) {
      try {
        // Calculate total daily tokens for all user's active subscriptions
        let totalDailyTokens = 0;
        let planNames: string[] = [];

        for (const subscription of user.subscriptions) {
          const dailyTokens = getDailyTokenAmount(subscription.plan_id);
          if (dailyTokens > 0) {
            totalDailyTokens += dailyTokens;
            if (!planNames.includes(subscription.plan_name)) {
              planNames.push(subscription.plan_name);
            }
          }
        }

        if (totalDailyTokens <= 0) {
          console.log(`⚠️ Skipping ${user.userEmail} - no token allocation`);
          continue;
        }

        // Use the primary subscription for the distribution record
        const primarySubscription = user.subscriptions[0];

        // Create today's distribution
        const distributionTime = new Date();
        distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

        const { data: distribution, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: user.userEmail,
            subscription_id: primarySubscription.id,
            plan_id: primarySubscription.plan_id,
            plan_name: planNames.length > 1 ? planNames.join(' + ') : planNames[0],
            token_amount: totalDailyTokens,
            distribution_date: today,
            status: 'completed',
            created_at: distributionTime.toISOString()
          })
          .select()
          .single();

        if (distError) {
          console.error(`❌ Error creating distribution for ${user.userEmail}:`, distError);
          results.push({
            user_email: user.userEmail,
            status: 'error',
            error: distError.message
          });
        } else {
          console.log(`✅ Created distribution for ${user.userEmail}: ${totalDailyTokens.toFixed(4)} TIC`);
          distributionsCreated++;
          
          // Update user's wallet balance
          try {
            await supabaseAdmin.rpc('increment_tic_balance_daily_distribution', {
              p_user_email: user.userEmail,
              p_amount: totalDailyTokens
            });
          } catch (walletError) {
            console.error(`⚠️ Wallet update failed for ${user.userEmail}:`, walletError);
          }

          results.push({
            user_email: user.userEmail,
            status: 'success',
            tokens_distributed: totalDailyTokens,
            plans: planNames.join(' + ')
          });
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.userEmail}:`, userError);
        results.push({
          user_email: user.userEmail,
          status: 'error',
          error: userError instanceof Error ? (userError as Error).message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 AUTO-FIX completed! Created ${distributionsCreated} distributions for ${today}`);

    return NextResponse.json({
      success: true,
      message: `AUTO-FIX: Created ${distributionsCreated} distributions for ${today}`,
      date: today,
      total_active_subscriptions: activeSubscriptions.length,
      unique_users: userEmails.length,
      users_needing_distribution: usersNeedingDistribution.length,
      distributions_created: distributionsCreated,
      results: results.slice(0, 10) // Show first 10 results
    });

  } catch (error) {
    console.error('❌ AUTO-FIX error:', error);
    return NextResponse.json({
      success: false,
      error: 'AUTO-FIX failed',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check if auto-fix is needed
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get count of active subscriptions
    const { count: activeSubsCount } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get count of today's distributions
    const { count: todayDistCount } = await supabaseAdmin
      .from('token_distributions')
      .select('*', { count: 'exact', head: true })
      .eq('distribution_date', today);

    // Get unique users with active subscriptions
    const { data: activeUsers } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_email')
      .eq('status', 'active');

    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_email) || []).size;

    // Get unique users with today's distributions
    const { data: todayUsers } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email')
      .eq('distribution_date', today);

    const uniqueTodayUsers = new Set(todayUsers?.map(u => u.user_email) || []).size;

    const needsFix = uniqueActiveUsers > uniqueTodayUsers;

    return NextResponse.json({
      success: true,
      date: today,
      active_subscriptions: activeSubsCount || 0,
      todays_distributions: todayDistCount || 0,
      unique_active_users: uniqueActiveUsers,
      unique_users_with_todays_distribution: uniqueTodayUsers,
      users_missing_todays_distribution: uniqueActiveUsers - uniqueTodayUsers,
      needs_auto_fix: needsFix,
      recommendation: needsFix 
        ? `${uniqueActiveUsers - uniqueTodayUsers} users need today's distribution`
        : 'All users have today\'s distributions'
    });

  } catch (error) {
    console.error('Error checking auto-fix status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check auto-fix status',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
