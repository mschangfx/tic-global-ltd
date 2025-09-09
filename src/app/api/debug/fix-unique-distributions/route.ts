import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Fix duplicate distributions and ensure unique daily distributions
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting unique distribution fix...');

    // Get user email from request body
    const body = await request.json();
    const userEmail = body.userEmail;

    if (!userEmail) {
      return NextResponse.json(
        { 
          error: 'User email required',
          details: 'Please provide userEmail in request body'
        },
        { status: 400 }
      );
    }

    console.log(`🔧 Fixing unique distributions for user: ${userEmail}`);

    // First, let's see what distributions currently exist
    const { data: existingDistributions, error: fetchError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .order('distribution_date', { ascending: false });

    if (fetchError) {
      console.error('Error fetching existing distributions:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch existing distributions',
          details: fetchError.message
        },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${existingDistributions?.length || 0} existing distributions`);
    
    // Group distributions by date to find duplicates
    const distributionsByDate = (existingDistributions || []).reduce((acc: any, dist: any) => {
      const date = dist.distribution_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(dist);
      return acc;
    }, {});

    console.log('📅 Distributions by date:', Object.keys(distributionsByDate).map(date => ({
      date,
      count: distributionsByDate[date].length
    })));

    // Delete ALL existing distributions for this user to start fresh
    console.log('🗑️ Deleting all existing distributions...');
    const { error: deleteError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .eq('user_email', userEmail);

    if (deleteError) {
      console.error('Error deleting existing distributions:', deleteError);
      return NextResponse.json(
        { 
          error: 'Failed to delete existing distributions',
          details: deleteError.message
        },
        { status: 500 }
      );
    }

    // Get user's active subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch subscriptions',
          details: subsError.message
        },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No active subscriptions found, creating test subscription...');
      
      // Create a test VIP subscription for this user
      const { data: newSubscription, error: createError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_email: userEmail,
          plan_id: 'vip',
          plan_name: 'VIP Plan',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating test subscription:', createError);
        return NextResponse.json(
          { 
            error: 'Failed to create test subscription',
            details: createError.message
          },
          { status: 500 }
        );
      }

      console.log('✅ Created test VIP subscription:', newSubscription);
      subscriptions.push(newSubscription);
    }

    // Token allocation per plan (yearly amounts)
    const TOKEN_ALLOCATIONS = {
      'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
      'starter': 500    // Starter Plan: 500 TIC tokens per year
    };

    // Calculate daily token amount
    const getDailyTokenAmount = (planId: string): number => {
      const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
      return yearlyAmount / 365;
    };

    const results = [];

    // Create UNIQUE distributions for the last 5 days
    // Important: Only ONE distribution per day, regardless of how many subscriptions
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const distributionDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      console.log(`📅 Creating UNIQUE distribution for date: ${distributionDate} (${i} days ago)`);

      // Calculate total daily tokens for ALL active subscriptions
      let totalDailyTokens = 0;
      let planNames = [];

      for (const subscription of subscriptions) {
        const dailyTokens = getDailyTokenAmount(subscription.plan_id);
        totalDailyTokens += dailyTokens;
        planNames.push(subscription.plan_name);
      }

      if (totalDailyTokens <= 0) {
        console.log(`⚠️ Skipping ${distributionDate} - no token allocation`);
        continue;
      }

      // Use the first subscription for the distribution record (or create a combined one)
      const primarySubscription = subscriptions[0];

      // Create a specific time for this distribution (morning hours)
      const distributionTime = new Date(date);
      distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

      try {
        // Create ONE distribution record per day
        const { data: distribution, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: userEmail,
            subscription_id: primarySubscription.id,
            plan_id: primarySubscription.plan_id,
            plan_name: planNames.join(' + '), // Show combined plan names if multiple
            token_amount: totalDailyTokens,
            distribution_date: distributionDate,
            status: 'completed',
            created_at: distributionTime.toISOString()
          })
          .select()
          .single();

        if (distError) {
          console.error(`Error creating distribution for ${distributionDate}:`, distError);
          results.push({
            date: distributionDate,
            plan: planNames.join(' + '),
            status: 'error',
            error: distError.message
          });
        } else {
          console.log(`✅ Created UNIQUE distribution for ${distributionDate}: ${totalDailyTokens.toFixed(4)} TIC`);
          results.push({
            date: distributionDate,
            plan: planNames.join(' + '),
            amount: totalDailyTokens,
            status: 'created',
            id: distribution.id
          });
        }
      } catch (insertError) {
        console.error(`Exception creating distribution for ${distributionDate}:`, insertError);
        results.push({
          date: distributionDate,
          plan: planNames.join(' + '),
          status: 'error',
          error: insertError instanceof Error ? (insertError as Error).message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'created').length;
    console.log(`🎉 Unique distribution fix completed. Created ${successCount} unique daily distributions.`);

    return NextResponse.json({
      success: true,
      message: `Fixed duplicate distributions - Created ${successCount} unique daily distributions`,
      userEmail,
      subscriptions: subscriptions.length,
      distributions_created: successCount,
      days_created: 5,
      duplicates_removed: (existingDistributions?.length || 0),
      results
    });

  } catch (error) {
    console.error('❌ Unexpected error in unique distribution fix:', error);
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

// GET - Check current distribution data
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required as query parameter' },
        { status: 400 }
      );
    }

    // Get current distributions
    const { data: distributions, error } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .order('distribution_date', { ascending: false })
      .limit(10);

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

    // Group by date to show duplicates
    const distributionsByDate = (distributions || []).reduce((acc: any, dist: any) => {
      const date = dist.distribution_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(dist);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      userEmail,
      distributions: distributions || [],
      count: distributions?.length || 0,
      unique_dates: Object.keys(distributionsByDate).length,
      duplicates: Object.keys(distributionsByDate).filter(date => distributionsByDate[date].length > 1),
      distributions_by_date: distributionsByDate
    });

  } catch (error) {
    console.error('Error checking distributions:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
