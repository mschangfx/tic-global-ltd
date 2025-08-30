import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Check Starter plan subscriptions and distributions
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Starter plan subscriptions and distributions...');

    // Get ALL subscriptions (both VIP and Starter)
    const { data: allSubscriptions, error: allSubsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('plan_id', { ascending: true });

    if (allSubsError) {
      console.error('Error fetching all subscriptions:', allSubsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch subscriptions',
          details: allSubsError.message
        },
        { status: 500 }
      );
    }

    // Group subscriptions by plan
    const subscriptionsByPlan = (allSubscriptions || []).reduce((acc: any, sub: any) => {
      if (!acc[sub.plan_id]) {
        acc[sub.plan_id] = [];
      }
      acc[sub.plan_id].push(sub);
      return acc;
    }, {});

    console.log('📊 Subscriptions by plan:', Object.keys(subscriptionsByPlan).map(planId => ({
      plan: planId,
      count: subscriptionsByPlan[planId].length
    })));

    // Get ALL distributions
    const { data: allDistributions, error: allDistsError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .order('plan_id', { ascending: true })
      .order('distribution_date', { ascending: false });

    if (allDistsError) {
      console.error('Error fetching all distributions:', allDistsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch distributions',
          details: allDistsError.message
        },
        { status: 500 }
      );
    }

    // Group distributions by plan
    const distributionsByPlan = (allDistributions || []).reduce((acc: any, dist: any) => {
      if (!acc[dist.plan_id]) {
        acc[dist.plan_id] = [];
      }
      acc[dist.plan_id].push(dist);
      return acc;
    }, {});

    console.log('📊 Distributions by plan:', Object.keys(distributionsByPlan).map(planId => ({
      plan: planId,
      count: distributionsByPlan[planId].length
    })));

    // Check for Starter plan users specifically
    const starterSubscriptions = subscriptionsByPlan['starter'] || [];
    const starterDistributions = distributionsByPlan['starter'] || [];

    // Get unique users for each plan
    const vipUsers = [...new Set((subscriptionsByPlan['vip'] || []).map((s: any) => s.user_email))];
    const starterUsers = [...new Set(starterSubscriptions.map((s: any) => s.user_email))];

    // Check which Starter users have distributions
    const starterUsersWithDistributions = [...new Set(starterDistributions.map((d: any) => d.user_email))];
    const starterUsersWithoutDistributions = starterUsers.filter(email => !starterUsersWithDistributions.includes(email));

    return NextResponse.json({
      success: true,
      summary: {
        total_subscriptions: allSubscriptions?.length || 0,
        total_distributions: allDistributions?.length || 0,
        vip_users: vipUsers.length,
        starter_users: starterUsers.length,
        starter_users_with_distributions: starterUsersWithDistributions.length,
        starter_users_without_distributions: starterUsersWithoutDistributions.length
      },
      subscriptions_by_plan: Object.keys(subscriptionsByPlan).map(planId => ({
        plan_id: planId,
        subscription_count: subscriptionsByPlan[planId].length,
        unique_users: [...new Set(subscriptionsByPlan[planId].map((s: any) => s.user_email))].length
      })),
      distributions_by_plan: Object.keys(distributionsByPlan).map(planId => ({
        plan_id: planId,
        distribution_count: distributionsByPlan[planId].length,
        unique_users: [...new Set(distributionsByPlan[planId].map((d: any) => d.user_email))].length
      })),
      starter_plan_details: {
        subscriptions: starterSubscriptions.length,
        distributions: starterDistributions.length,
        users_with_subscriptions: starterUsers,
        users_with_distributions: starterUsersWithDistributions,
        users_missing_distributions: starterUsersWithoutDistributions,
        sample_subscriptions: starterSubscriptions.slice(0, 3),
        sample_distributions: starterDistributions.slice(0, 3)
      },
      vip_plan_details: {
        subscriptions: (subscriptionsByPlan['vip'] || []).length,
        distributions: (distributionsByPlan['vip'] || []).length,
        users: vipUsers.length
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error checking Starter plans:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create missing distributions for Starter plan users
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating missing distributions for Starter plan users...');

    const body = await request.json();
    const adminKey = body.adminKey;

    // Simple admin verification
    if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    // Get all active Starter subscriptions
    const { data: starterSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('plan_id', 'starter')
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching Starter subscriptions:', subsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch Starter subscriptions',
          details: subsError.message
        },
        { status: 500 }
      );
    }

    if (!starterSubscriptions || starterSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active Starter subscriptions found',
        starter_subscriptions: 0,
        distributions_created: 0
      });
    }

    console.log(`📊 Found ${starterSubscriptions.length} active Starter subscriptions`);

    // Token allocation for Starter plan
    const STARTER_DAILY_TOKENS = 500 / 365; // 1.3699 TIC per day

    const results = [];
    let totalDistributionsCreated = 0;

    // Process each Starter subscription
    for (const subscription of starterSubscriptions) {
      try {
        console.log(`👤 Processing Starter user: ${subscription.user_email}`);

        // Delete existing distributions for this user (to avoid duplicates)
        const { error: deleteError } = await supabaseAdmin
          .from('token_distributions')
          .delete()
          .eq('user_email', subscription.user_email)
          .eq('plan_id', 'starter');

        if (deleteError) {
          console.error(`Error deleting existing distributions for ${subscription.user_email}:`, deleteError);
        }

        // Create distributions for the last 5 days
        const userDistributions = [];
        
        for (let i = 4; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const distributionDate = date.toISOString().split('T')[0];

          // Create a specific time for this distribution
          const distributionTime = new Date(date);
          distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

          try {
            const { data: distribution, error: distError } = await supabaseAdmin
              .from('token_distributions')
              .insert({
                user_email: subscription.user_email,
                subscription_id: subscription.id,
                plan_id: 'starter',
                plan_name: 'Starter Plan',
                token_amount: STARTER_DAILY_TOKENS,
                distribution_date: distributionDate,
                status: 'completed',
                created_at: distributionTime.toISOString()
              })
              .select()
              .single();

            if (distError) {
              console.error(`Error creating distribution for ${subscription.user_email} on ${distributionDate}:`, distError);
            } else {
              console.log(`✅ Created Starter distribution for ${subscription.user_email} on ${distributionDate}: ${STARTER_DAILY_TOKENS.toFixed(4)} TIC`);
              userDistributions.push({
                date: distributionDate,
                amount: STARTER_DAILY_TOKENS
              });
              totalDistributionsCreated++;
            }
          } catch (insertError) {
            console.error(`Exception creating distribution for ${subscription.user_email} on ${distributionDate}:`, insertError);
          }
        }

        results.push({
          user_email: subscription.user_email,
          status: 'success',
          distributions_created: userDistributions.length,
          distributions: userDistributions
        });

      } catch (userError) {
        console.error(`Error processing Starter user ${subscription.user_email}:`, userError);
        results.push({
          user_email: subscription.user_email,
          status: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 Starter plan fix completed! Created ${totalDistributionsCreated} distributions.`);

    return NextResponse.json({
      success: true,
      message: `Created missing distributions for Starter plan users`,
      starter_subscriptions: starterSubscriptions.length,
      distributions_created: totalDistributionsCreated,
      daily_amount: STARTER_DAILY_TOKENS,
      results: results.slice(0, 10) // Show first 10 results
    });

  } catch (error) {
    console.error('❌ Unexpected error creating Starter distributions:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
