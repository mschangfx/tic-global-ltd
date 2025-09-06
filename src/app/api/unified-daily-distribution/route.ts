import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// OFFICIAL TOKEN ALLOCATIONS - DO NOT CHANGE
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year = 18.9 TIC per day
  'starter': 500    // Starter Plan: 500 TIC tokens per year = 1.37 TIC per day
} as const;

// Calculate exact daily token amount
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // VIP: 18.904109589, Starter: 1.369863014
};

// UNIFIED DAILY DISTRIBUTION SYSTEM
// This function ensures ALL users (existing and new) get their daily TIC tokens
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 UNIFIED DAILY DISTRIBUTION: Starting for all users...');
    
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toISOString();
    
    console.log(`📅 Processing distributions for: ${today}`);
    console.log(`⏰ Current time: ${currentTime}`);

    // Step 1: Get ALL active subscriptions
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
      .gte('end_date', currentTime)
      .order('user_email', { ascending: true });

    if (subsError) {
      console.error('❌ Error fetching active subscriptions:', subsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch active subscriptions',
        details: subsError.message
      }, { status: 500 });
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      console.log('⚠️ No active subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        date: today,
        users_processed: 0,
        distributions_created: 0
      });
    }

    console.log(`👥 Found ${activeSubscriptions.length} active subscriptions`);

    // Step 2: Group subscriptions by user email (handle multiple plans per user)
    const subscriptionsByUser = activeSubscriptions.reduce((acc: any, sub: any) => {
      if (!acc[sub.user_email]) {
        acc[sub.user_email] = [];
      }
      acc[sub.user_email].push(sub);
      return acc;
    }, {});

    const userEmails = Object.keys(subscriptionsByUser);
    console.log(`👤 Processing ${userEmails.length} unique users`);

    // Step 3: Check which users already have distributions for today
    const { data: existingDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, token_amount')
      .eq('distribution_date', today);

    const usersWithDistributions = new Set(
      (existingDistributions || []).map(d => d.user_email)
    );

    console.log(`📊 ${usersWithDistributions.size} users already have distributions for today`);

    // Step 4: Process each user
    let distributionsCreated = 0;
    let distributionsSkipped = 0;
    const results = [];

    for (const userEmail of userEmails) {
      try {
        // Skip if user already has distribution for today
        if (usersWithDistributions.has(userEmail)) {
          console.log(`⏭️ Skipping ${userEmail} - already has distribution for today`);
          distributionsSkipped++;
          continue;
        }

        const userSubscriptions = subscriptionsByUser[userEmail];
        
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

        // Create distribution record with random time between 8-12 AM
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
            distribution_date: today,
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
            error: distError.message
          });
          continue;
        }

        console.log(`✅ Created distribution for ${userEmail}: ${totalDailyTokens.toFixed(4)} TIC`);

        // Update user's wallet balance
        const transactionId = `unified_daily_tic_${today}_${userEmail.replace('@', '_').replace('.', '_')}`;
        const description = `Daily TIC Distribution - ${planNames.join(' + ')} (${totalDailyTokens.toFixed(4)} TIC)`;

        const { error: walletError } = await supabaseAdmin
          .rpc('increment_tic_balance_daily_distribution', {
            user_email_param: userEmail,
            amount_param: totalDailyTokens,
            transaction_id_param: transactionId,
            description_param: description,
            plan_type_param: primarySubscription.plan_id
          });

        if (walletError) {
          console.error(`⚠️ Wallet update failed for ${userEmail}:`, walletError);
          // Don't fail the distribution, just log the error
        } else {
          console.log(`💰 Updated wallet balance for ${userEmail}: +${totalDailyTokens.toFixed(4)} TIC`);
        }

        distributionsCreated++;
        results.push({
          user_email: userEmail,
          status: 'success',
          tokens_distributed: totalDailyTokens,
          plans: planNames.join(' + '),
          distribution_id: distribution.id,
          expected_amounts: {
            vip_daily: getDailyTokenAmount('vip'),
            starter_daily: getDailyTokenAmount('starter')
          }
        });

      } catch (userError) {
        console.error(`❌ Error processing user ${userEmail}:`, userError);
        results.push({
          user_email: userEmail,
          status: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 UNIFIED DISTRIBUTION COMPLETED!`);
    console.log(`✅ Created: ${distributionsCreated} new distributions`);
    console.log(`⏭️ Skipped: ${distributionsSkipped} existing distributions`);

    return NextResponse.json({
      success: true,
      message: `Unified daily distribution completed for ${today}`,
      date: today,
      timestamp: currentTime,
      summary: {
        total_active_subscriptions: activeSubscriptions.length,
        unique_users: userEmails.length,
        users_with_existing_distributions: usersWithDistributions.size,
        distributions_created: distributionsCreated,
        distributions_skipped: distributionsSkipped
      },
      token_allocations: {
        vip_daily: getDailyTokenAmount('vip'),
        starter_daily: getDailyTokenAmount('starter'),
        vip_yearly: TOKEN_ALLOCATIONS.vip,
        starter_yearly: TOKEN_ALLOCATIONS.starter
      },
      results: results.slice(0, 20) // Show first 20 results
    });

  } catch (error) {
    console.error('❌ UNIFIED DISTRIBUTION ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Unified distribution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check distribution status
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get active subscriptions count
    const { count: activeSubsCount } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    // Get today's distributions
    const { data: todayDistributions, count: todayDistCount } = await supabaseAdmin
      .from('token_distributions')
      .select('*', { count: 'exact' })
      .eq('distribution_date', today);

    // Get unique users with active subscriptions
    const { data: activeUsers } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_email')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_email) || []).size;
    const uniqueUsersWithDistributions = new Set(todayDistributions?.map(d => d.user_email) || []).size;

    return NextResponse.json({
      success: true,
      date: today,
      timestamp: new Date().toISOString(),
      status: {
        active_subscriptions: activeSubsCount || 0,
        unique_active_users: uniqueActiveUsers,
        todays_distributions: todayDistCount || 0,
        unique_users_with_distributions: uniqueUsersWithDistributions,
        users_missing_distributions: uniqueActiveUsers - uniqueUsersWithDistributions,
        distribution_coverage: uniqueActiveUsers > 0 ? Math.round((uniqueUsersWithDistributions / uniqueActiveUsers) * 100) : 0
      },
      token_allocations: {
        vip_daily: getDailyTokenAmount('vip'),
        starter_daily: getDailyTokenAmount('starter'),
        vip_yearly: TOKEN_ALLOCATIONS.vip,
        starter_yearly: TOKEN_ALLOCATIONS.starter
      },
      sample_distributions: todayDistributions?.slice(0, 10) || []
    });

  } catch (error) {
    console.error('Error checking unified distribution status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
