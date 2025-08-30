import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Fix distribution dates and create proper test data
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log(`🔧 Fixing distribution dates for user: ${userEmail}`);

    // Get user's active subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active subscriptions found',
        userEmail
      });
    }

    // Delete existing distributions for this user to start fresh
    const { error: deleteError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .eq('user_email', userEmail);

    if (deleteError) {
      console.error('Error deleting existing distributions:', deleteError);
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

    // Create distributions for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const distributionDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      for (const subscription of subscriptions) {
        const dailyTokens = getDailyTokenAmount(subscription.plan_id);

        if (dailyTokens <= 0) continue;

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
            created_at: new Date(date.getTime() + Math.random() * 86400000).toISOString() // Random time within the day
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
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Distribution dates fixed and test data created',
      userEmail,
      subscriptions: subscriptions.length,
      distributions_created: results.filter(r => r.status === 'created').length,
      results
    });

  } catch (error) {
    console.error('Error fixing distribution dates:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check current distribution data
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
      return NextResponse.json(
        { error: 'Failed to fetch distributions' },
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
