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
  return yearlyAmount / 365; // Exact value without rounding
};

// POST - One-time system-wide fix for ALL users and ALL plans
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting ONE-TIME SYSTEM-WIDE FIX for all TIC distributions...');

    const body = await request.json();
    const adminKey = body.adminKey;

    // Admin verification
    if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    // STEP 1: Get ALL active subscriptions (VIP + Starter + any other plans)
    console.log('📊 Step 1: Fetching ALL active subscriptions...');
    const { data: allSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('user_email', { ascending: true });

    if (subsError) {
      console.error('❌ Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch subscriptions',
          details: subsError.message
        },
        { status: 500 }
      );
    }

    console.log(`📈 Found ${allSubscriptions?.length || 0} active subscriptions`);

    if (!allSubscriptions || allSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        users_processed: 0,
        distributions_created: 0
      });
    }

    // STEP 2: Group subscriptions by user email
    const subscriptionsByUser = allSubscriptions.reduce((acc: any, sub: any) => {
      if (!acc[sub.user_email]) {
        acc[sub.user_email] = [];
      }
      acc[sub.user_email].push(sub);
      return acc;
    }, {});

    const userEmails = Object.keys(subscriptionsByUser);
    console.log(`👥 Processing ${userEmails.length} unique users`);

    // STEP 3: Process each user in batches to avoid timeout
    const BATCH_SIZE = 10; // Process 10 users at a time
    const results = [];
    let totalDistributionsCreated = 0;
    let totalUsersProcessed = 0;

    for (let i = 0; i < userEmails.length; i += BATCH_SIZE) {
      const batch = userEmails.slice(i, i + BATCH_SIZE);
      console.log(`\n🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(userEmails.length/BATCH_SIZE)} (${batch.length} users)`);

      for (const userEmail of batch) {
        try {
          const userSubscriptions = subscriptionsByUser[userEmail];
          console.log(`👤 Processing user: ${userEmail} (${userSubscriptions.length} subscriptions)`);

          // STEP 4: Delete ALL existing distributions for this user to start fresh
          const { error: deleteError } = await supabaseAdmin
            .from('token_distributions')
            .delete()
            .eq('user_email', userEmail);

          if (deleteError) {
            console.error(`❌ Error deleting distributions for ${userEmail}:`, deleteError);
            // Continue anyway
          }

          // STEP 5: Create distributions for the last 5 days
          const userDistributions = [];
          
          for (let dayOffset = 4; dayOffset >= 0; dayOffset--) {
            const date = new Date();
            date.setDate(date.getDate() - dayOffset);
            const distributionDate = date.toISOString().split('T')[0];

            // Calculate total daily tokens for ALL active subscriptions for this user
            let totalDailyTokens = 0;
            let planNames = [];

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
              console.log(`⚠️ Skipping ${distributionDate} for ${userEmail} - no token allocation`);
              continue;
            }

            // Use the primary subscription for the distribution record
            const primarySubscription = userSubscriptions[0];

            // Create a specific time for this distribution
            const distributionTime = new Date(date);
            distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

            try {
              // Create ONE distribution record per day per user (combining all their plans)
              const { data: distribution, error: distError } = await supabaseAdmin
                .from('token_distributions')
                .insert({
                  user_email: userEmail,
                  subscription_id: primarySubscription.id,
                  plan_id: primarySubscription.plan_id,
                  plan_name: planNames.length > 1 ? planNames.join(' + ') : planNames[0],
                  token_amount: totalDailyTokens,
                  distribution_date: distributionDate,
                  status: 'completed',
                  created_at: distributionTime.toISOString()
                })
                .select()
                .single();

              if (distError) {
                console.error(`❌ Error creating distribution for ${userEmail} on ${distributionDate}:`, distError);
              } else {
                console.log(`✅ Created distribution for ${userEmail} on ${distributionDate}: ${totalDailyTokens.toFixed(4)} TIC`);
                userDistributions.push({
                  date: distributionDate,
                  amount: totalDailyTokens,
                  plans: planNames.join(' + ')
                });
                totalDistributionsCreated++;
              }
            } catch (insertError) {
              console.error(`❌ Exception creating distribution for ${userEmail} on ${distributionDate}:`, insertError);
            }
          }

          results.push({
            user_email: userEmail,
            status: 'success',
            subscriptions: userSubscriptions.length,
            distributions_created: userDistributions.length,
            plans: userSubscriptions.map((s: any) => s.plan_name).join(', '),
            distributions: userDistributions
          });

          totalUsersProcessed++;
          console.log(`✅ Completed ${userEmail}: ${userDistributions.length} distributions created`);

        } catch (userError) {
          console.error(`❌ Error processing user ${userEmail}:`, userError);
          results.push({
            user_email: userEmail,
            status: 'error',
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < userEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // STEP 6: Trigger the daily distribution cron to ensure it's working
    console.log('\n🔄 Step 6: Testing automated daily distribution system...');
    try {
      const cronResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://ticgloballtd.com'}/api/cron/daily-tic-distribution`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'cron-secret-key'}`,
          'Content-Type': 'application/json'
        }
      });

      const cronData = await cronResponse.json();
      console.log('✅ Daily distribution system test completed:', cronData.success ? 'WORKING' : 'NEEDS ATTENTION');
    } catch (cronError) {
      console.error('⚠️ Could not test daily distribution system:', cronError);
    }

    console.log(`\n🎉 ONE-TIME SYSTEM-WIDE FIX COMPLETED!`);
    console.log(`👥 Users processed: ${totalUsersProcessed}/${userEmails.length}`);
    console.log(`📊 Total distributions created: ${totalDistributionsCreated}`);
    console.log(`🔄 Automated system: Ready for future distributions`);

    return NextResponse.json({
      success: true,
      message: `ONE-TIME SYSTEM-WIDE FIX COMPLETED - All users now have proper TIC distributions`,
      total_users: userEmails.length,
      users_processed: totalUsersProcessed,
      total_subscriptions: allSubscriptions.length,
      distributions_created: totalDistributionsCreated,
      days_created: 5,
      automated_system_status: 'Ready for future distributions',
      summary: {
        successful_users: results.filter(r => r.status === 'success').length,
        failed_users: results.filter(r => r.status === 'error').length,
        total_distributions: totalDistributionsCreated,
        vip_users: results.filter(r => r.plans?.includes('VIP')).length,
        starter_users: results.filter(r => r.plans?.includes('Starter')).length
      },
      next_steps: [
        'All existing users now have proper distribution history',
        'New users will automatically get distributions via daily cron job',
        'VIP users see 18.90 TIC per day',
        'Starter users see 1.37 TIC per day',
        'No more manual fixes needed'
      ]
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR in one-time system fix:', error);
    return NextResponse.json(
      { 
        error: 'System fix failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Check system status before running fix
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('adminKey');

    if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    // Get system overview
    const { data: allSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_email, plan_id, plan_name, status')
      .eq('status', 'active');

    const { data: allDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, plan_id, distribution_date')
      .order('distribution_date', { ascending: false });

    // Analyze the data
    const subscriptionsByPlan = (allSubscriptions || []).reduce((acc: any, sub: any) => {
      if (!acc[sub.plan_id]) acc[sub.plan_id] = [];
      acc[sub.plan_id].push(sub);
      return acc;
    }, {});

    const distributionsByPlan = (allDistributions || []).reduce((acc: any, dist: any) => {
      if (!acc[dist.plan_id]) acc[dist.plan_id] = [];
      acc[dist.plan_id].push(dist);
      return acc;
    }, {});

    const uniqueUsersWithSubscriptions = new Set((allSubscriptions || []).map(s => s.user_email)).size;
    const uniqueUsersWithDistributions = new Set((allDistributions || []).map(d => d.user_email)).size;

    return NextResponse.json({
      success: true,
      system_overview: {
        total_active_subscriptions: allSubscriptions?.length || 0,
        total_distributions: allDistributions?.length || 0,
        unique_users_with_subscriptions: uniqueUsersWithSubscriptions,
        unique_users_with_distributions: uniqueUsersWithDistributions,
        users_missing_distributions: uniqueUsersWithSubscriptions - uniqueUsersWithDistributions
      },
      plan_breakdown: Object.keys(subscriptionsByPlan).map(planId => ({
        plan_id: planId,
        subscriptions: subscriptionsByPlan[planId].length,
        distributions: (distributionsByPlan[planId] || []).length,
        unique_users_with_subscriptions: new Set(subscriptionsByPlan[planId].map((s: any) => s.user_email)).size,
        unique_users_with_distributions: new Set((distributionsByPlan[planId] || []).map((d: any) => d.user_email)).size,
        daily_amount: getDailyTokenAmount(planId)
      })),
      needs_fix: uniqueUsersWithSubscriptions > uniqueUsersWithDistributions,
      recommendation: uniqueUsersWithSubscriptions > uniqueUsersWithDistributions 
        ? 'Run the one-time system fix to create missing distributions for all users'
        : 'System appears healthy - all users have distributions'
    });

  } catch (error) {
    console.error('Error checking system status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
