import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get user's TIC distribution history
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId'); // Optional plan filter
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use authenticated user's email instead of accepting it from query params
    const userEmail = session.user.email;

    console.log(`🔍 Getting TIC distribution history for: ${userEmail}`);

    // Build query with optional plan filter
    let query = supabaseAdmin
      .from('token_distributions')
      .select(`
        id,
        subscription_id,
        plan_id,
        plan_name,
        token_amount,
        distribution_date,
        status,
        created_at
      `)
      .eq('user_email', userEmail);

    // Add plan filter if specified
    if (planId) {
      query = query.eq('plan_id', planId);
    }

    // Get user's token distribution history
    const { data: distributions, error } = await query
      .order('distribution_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching distribution history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch distribution history' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('token_distributions')
      .select('token_amount')
      .eq('user_email', userEmail);

    let totalDistributed = 0;
    let distributionCount = 0;

    if (!summaryError && summaryData) {
      totalDistributed = summaryData.reduce((sum, dist) => sum + parseFloat(dist.token_amount.toString()), 0);
      distributionCount = summaryData.length;
    }

    // Get current active subscriptions for context
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, plan_id, plan_name, status, start_date, end_date')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    console.log(`✅ Found ${distributions?.length || 0} distribution records for ${userEmail}`);

    return NextResponse.json({
      success: true,
      user_email: userEmail,
      distributions: distributions || [],
      summary: {
        total_distributed: totalDistributed,
        distribution_count: distributionCount,
        average_per_distribution: distributionCount > 0 ? totalDistributed / distributionCount : 0
      },
      active_subscriptions: activeSubscriptions || [],
      pagination: {
        limit,
        offset,
        has_more: (distributions?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Error in distribution history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Manually trigger TIC distribution for current user (for testing)
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
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    console.log(`🎯 Manual TIC distribution requested for: ${userEmail}, plan: ${planId}`);

    // Get user's active subscription for this plan
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('plan_id', planId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found for this plan' },
        { status: 404 }
      );
    }

    // Token allocation per plan (yearly amounts)
    const TOKEN_ALLOCATIONS = {
      'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
      'starter': 500    // Starter Plan: 500 TIC tokens per year
    } as const;

    // Calculate daily token amount
    const getDailyTokenAmount = (planId: string): number => {
      const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
      return yearlyAmount / 365;
    };

    const today = new Date().toISOString().split('T')[0];
    const dailyTokens = getDailyTokenAmount(planId);

    if (dailyTokens <= 0) {
      return NextResponse.json(
        { error: 'No TIC tokens allocated for this plan' },
        { status: 400 }
      );
    }

    // Check if already distributed today
    const { data: existingDistribution } = await supabaseAdmin
      .from('token_distributions')
      .select('id')
      .eq('user_email', userEmail)
      .eq('subscription_id', subscription.id)
      .eq('distribution_date', today)
      .single();

    if (existingDistribution) {
      return NextResponse.json(
        { error: 'TIC tokens already distributed today for this plan' },
        { status: 400 }
      );
    }

    // Create distribution record
    const { data: distribution, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .insert({
        user_email: userEmail,
        subscription_id: subscription.id,
        plan_id: planId,
        plan_name: subscription.plan_name,
        token_amount: dailyTokens,
        distribution_date: today,
        status: 'completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (distError) {
      console.error('Error creating distribution record:', distError);
      return NextResponse.json(
        { error: 'Failed to create distribution record' },
        { status: 500 }
      );
    }

    // Update TIC balance
    const transactionId = `manual_tic_${planId}_${today}_${subscription.id}`;
    const description = `Manual TIC Distribution - ${subscription.plan_name} (${dailyTokens} TIC)`;

    const { error: walletError } = await supabaseAdmin
      .rpc('increment_tic_balance_daily_distribution', {
        user_email_param: userEmail,
        amount_param: dailyTokens,
        transaction_id_param: transactionId,
        description_param: description,
        plan_type_param: planId
      });

    if (walletError) {
      console.error('Error updating TIC balance:', walletError);
      return NextResponse.json(
        { error: 'Failed to update TIC balance' },
        { status: 500 }
      );
    }

    console.log(`✅ Manual TIC distribution successful: ${dailyTokens} TIC to ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: 'TIC tokens distributed successfully',
      distribution: {
        id: distribution.id,
        plan_name: subscription.plan_name,
        token_amount: dailyTokens,
        distribution_date: today,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('Error in manual distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
