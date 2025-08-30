import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Simple fix for distribution dates with better error handling
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting simple distribution fix...');

    // Get current user from session
    const session = await getServerSession(authOptions);
    console.log('📧 Session user:', session?.user?.email);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          error: 'User not authenticated',
          details: 'No session or email found'
        },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log(`🔧 Fixing distribution dates for user: ${userEmail}`);

    // First, let's check if we can connect to Supabase
    try {
      const { data: testConnection } = await supabaseAdmin
        .from('user_subscriptions')
        .select('count')
        .limit(1);
      console.log('✅ Supabase connection test passed');
    } catch (connError) {
      console.error('❌ Supabase connection failed:', connError);
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: connError instanceof Error ? connError.message : 'Unknown connection error'
        },
        { status: 500 }
      );
    }

    // Get user's active subscriptions with better error handling
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active');

    console.log('📊 Subscriptions query result:', { subscriptions, subsError });

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch subscriptions',
          details: subsError.message,
          code: subsError.code
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
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
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

    // Delete existing distributions for this user
    console.log('🗑️ Deleting existing distributions...');
    const { error: deleteError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .eq('user_email', userEmail);

    if (deleteError) {
      console.error('Error deleting existing distributions:', deleteError);
      // Continue anyway, don't fail here
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

    // Create distributions for the last 5 days
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const distributionDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      console.log(`📅 Creating distribution for date: ${distributionDate} (${i} days ago)`);

      for (const subscription of subscriptions) {
        const dailyTokens = getDailyTokenAmount(subscription.plan_id);

        if (dailyTokens <= 0) {
          console.log(`⚠️ Skipping ${subscription.plan_id} - no token allocation`);
          continue;
        }

        // Create a specific time for this distribution (morning hours)
        const distributionTime = new Date(date);
        distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

        try {
          // Create distribution record
          const { data: distribution, error: distError } = await supabaseAdmin
            .from('token_distributions')
            .insert({
              user_email: userEmail,
              subscription_id: subscription.id,
              plan_id: subscription.plan_id,
              plan_name: subscription.plan_name,
              token_amount: dailyTokens,
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
              plan: subscription.plan_name,
              status: 'error',
              error: distError.message
            });
          } else {
            console.log(`✅ Created distribution for ${distributionDate}: ${dailyTokens.toFixed(4)} TIC`);
            results.push({
              date: distributionDate,
              plan: subscription.plan_name,
              amount: dailyTokens,
              status: 'created',
              id: distribution.id
            });
          }
        } catch (insertError) {
          console.error(`Exception creating distribution for ${distributionDate}:`, insertError);
          results.push({
            date: distributionDate,
            plan: subscription.plan_name,
            status: 'error',
            error: insertError instanceof Error ? insertError.message : 'Unknown error'
          });
        }
      }
    }

    const successCount = results.filter(r => r.status === 'created').length;
    console.log(`🎉 Distribution fix completed. Created ${successCount} distributions.`);

    return NextResponse.json({
      success: true,
      message: `Distribution dates fixed - Created last 5 days of distributions`,
      userEmail,
      subscriptions: subscriptions.length,
      distributions_created: successCount,
      days_created: 5,
      results
    });

  } catch (error) {
    console.error('❌ Unexpected error in distribution fix:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Check current distribution data with better error handling
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

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

    return NextResponse.json({
      success: true,
      userEmail,
      distributions: distributions || [],
      count: distributions?.length || 0
    });

  } catch (error) {
    console.error('Error checking distributions:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
