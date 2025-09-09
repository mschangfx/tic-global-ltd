import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Fix duplicate distributions for ALL users and ALL plan types
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting system-wide duplicate distribution fix...');

    // Get admin key from request body
    const body = await request.json();
    const adminKey = body.adminKey;

    // Simple admin verification
    if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    // Get ALL active subscriptions from all users
    const { data: allSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('user_email', { ascending: true });

    if (subsError) {
      console.error('Error fetching all subscriptions:', subsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch subscriptions',
          details: subsError.message
        },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${allSubscriptions?.length || 0} active subscriptions across all users`);

    if (!allSubscriptions || allSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found to process',
        users_processed: 0,
        distributions_created: 0
      });
    }

    // Group subscriptions by user email
    const subscriptionsByUser = allSubscriptions.reduce((acc: any, sub: any) => {
      if (!acc[sub.user_email]) {
        acc[sub.user_email] = [];
      }
      acc[sub.user_email].push(sub);
      return acc;
    }, {});

    const userEmails = Object.keys(subscriptionsByUser);
    console.log(`👥 Processing ${userEmails.length} unique users`);

    // Token allocation per plan (yearly amounts)
    const TOKEN_ALLOCATIONS = {
      'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
      'starter': 500,   // Starter Plan: 500 TIC tokens per year
      'premium': 2000,  // Premium Plan: 2000 TIC tokens per year (if exists)
      'basic': 200      // Basic Plan: 200 TIC tokens per year (if exists)
    };

    // Calculate daily token amount
    const getDailyTokenAmount = (planId: string): number => {
      const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
      return yearlyAmount / 365;
    };

    const results = [];
    let totalDistributionsCreated = 0;
    let totalUsersProcessed = 0;

    // Process each user
    for (const userEmail of userEmails) {
      try {
        console.log(`\n👤 Processing user: ${userEmail}`);
        const userSubscriptions = subscriptionsByUser[userEmail];

        // Delete ALL existing distributions for this user
        console.log(`🗑️ Deleting existing distributions for ${userEmail}...`);
        const { error: deleteError } = await supabaseAdmin
          .from('token_distributions')
          .delete()
          .eq('user_email', userEmail);

        if (deleteError) {
          console.error(`Error deleting distributions for ${userEmail}:`, deleteError);
          results.push({
            user_email: userEmail,
            status: 'error',
            error: `Failed to delete existing distributions: ${deleteError.message}`
          });
          continue;
        }

        // Create UNIQUE distributions for the last 5 days
        const userDistributions = [];
        
        for (let i = 4; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const distributionDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format

          // Calculate total daily tokens for ALL active subscriptions for this user
          let totalDailyTokens = 0;
          let planNames = [];

          for (const subscription of userSubscriptions) {
            const dailyTokens = getDailyTokenAmount(subscription.plan_id);
            if (dailyTokens > 0) {
              totalDailyTokens += dailyTokens;
              planNames.push(subscription.plan_name);
            }
          }

          if (totalDailyTokens <= 0) {
            console.log(`⚠️ Skipping ${distributionDate} for ${userEmail} - no token allocation`);
            continue;
          }

          // Use the first subscription for the distribution record
          const primarySubscription = userSubscriptions[0];

          // Create a specific time for this distribution (morning hours)
          const distributionTime = new Date(date);
          distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

          try {
            // Create ONE distribution record per day per user
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
              console.error(`Error creating distribution for ${userEmail} on ${distributionDate}:`, distError);
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
            console.error(`Exception creating distribution for ${userEmail} on ${distributionDate}:`, insertError);
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
        console.log(`✅ Completed processing ${userEmail}: ${userDistributions.length} distributions created`);

      } catch (userError) {
        console.error(`Error processing user ${userEmail}:`, userError);
        results.push({
          user_email: userEmail,
          status: 'error',
          error: userError instanceof Error ? (userError as Error).message : 'Unknown error'
        });
      }
    }

    console.log(`\n🎉 System-wide fix completed!`);
    console.log(`👥 Users processed: ${totalUsersProcessed}`);
    console.log(`📊 Total distributions created: ${totalDistributionsCreated}`);

    return NextResponse.json({
      success: true,
      message: `System-wide duplicate distribution fix completed`,
      total_users: userEmails.length,
      users_processed: totalUsersProcessed,
      total_subscriptions: allSubscriptions.length,
      distributions_created: totalDistributionsCreated,
      days_created: 5,
      results: results.slice(0, 10), // Show first 10 results to avoid huge response
      summary: {
        successful_users: results.filter(r => r.status === 'success').length,
        failed_users: results.filter(r => r.status === 'error').length,
        total_distributions: totalDistributionsCreated
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in system-wide distribution fix:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Check system-wide distribution status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('adminKey');

    // Simple admin verification
    if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    // Get distribution statistics
    const { data: allDistributions, error } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, distribution_date, plan_id, token_amount')
      .order('user_email', { ascending: true })
      .order('distribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching distributions:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch distributions',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Analyze distributions
    const distributionsByUser = (allDistributions || []).reduce((acc: any, dist: any) => {
      if (!acc[dist.user_email]) {
        acc[dist.user_email] = {};
      }
      if (!acc[dist.user_email][dist.distribution_date]) {
        acc[dist.user_email][dist.distribution_date] = [];
      }
      acc[dist.user_email][dist.distribution_date].push(dist);
      return acc;
    }, {});

    const userEmails = Object.keys(distributionsByUser);
    let totalDuplicates = 0;
    const duplicateUsers = [];

    for (const userEmail of userEmails) {
      const userDates = distributionsByUser[userEmail];
      for (const date of Object.keys(userDates)) {
        const distributionsForDate = userDates[date];
        if (distributionsForDate.length > 1) {
          totalDuplicates += distributionsForDate.length - 1;
          duplicateUsers.push({
            user_email: userEmail,
            date,
            duplicate_count: distributionsForDate.length
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_users: userEmails.length,
      total_distributions: allDistributions?.length || 0,
      duplicate_distributions: totalDuplicates,
      users_with_duplicates: duplicateUsers.length,
      duplicate_examples: duplicateUsers.slice(0, 5), // Show first 5 examples
      needs_fix: totalDuplicates > 0
    });

  } catch (error) {
    console.error('Error checking distribution status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
