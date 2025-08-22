import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

// Function to distribute initial TIC tokens immediately after plan purchase
async function distributeInitialTicTokens(
  userEmail: string, 
  planId: string, 
  planName: string, 
  subscriptionId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const dailyTokens = getDailyTokenAmount(planId);

  if (dailyTokens <= 0) {
    console.log(`No TIC tokens to distribute for plan: ${planId}`);
    return;
  }

  console.log(`🎯 Distributing initial TIC tokens: ${dailyTokens} TIC to ${userEmail} for ${planName}`);

  // Check if tokens already distributed today for this subscription
  const { data: existingDistribution } = await supabaseAdmin
    .from('token_distributions')
    .select('id')
    .eq('user_email', userEmail)
    .eq('subscription_id', subscriptionId)
    .eq('distribution_date', today)
    .single();

  if (existingDistribution) {
    console.log(`TIC tokens already distributed today for ${userEmail} (${planName})`);
    return;
  }

  // Create token distribution record
  const { data: distribution, error: distError } = await supabaseAdmin
    .from('token_distributions')
    .insert({
      user_email: userEmail,
      subscription_id: subscriptionId,
      plan_id: planId,
      plan_name: planName,
      token_amount: dailyTokens,
      distribution_date: today,
      status: 'completed',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (distError) {
    console.error(`Error creating initial distribution record for ${userEmail}:`, distError);
    throw new Error(`Failed to create distribution record: ${distError.message}`);
  }

  // Update user's TIC token balance using RPC function with transaction history
  const transactionId = `initial_tic_${planId}_${today}_${subscriptionId}`;
  const description = `Initial TIC Distribution - ${planName} (${dailyTokens} TIC)`;

  const { error: walletError } = await supabaseAdmin
    .rpc('increment_tic_balance_daily_distribution', {
      user_email_param: userEmail,
      amount_param: dailyTokens,
      transaction_id_param: transactionId,
      description_param: description,
      plan_type_param: planId
    });

  if (walletError) {
    console.error(`Error updating TIC balance for ${userEmail}:`, walletError);
    throw new Error(`Failed to update TIC balance: ${walletError.message}`);
  }

  console.log(`✅ Initial TIC distribution successful: ${dailyTokens} TIC distributed to ${userEmail}`);
}

// POST - Test immediate TIC distribution
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
    const { planId, subscriptionId } = body;

    if (!planId || !subscriptionId) {
      return NextResponse.json(
        { error: 'Plan ID and subscription ID are required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing immediate TIC distribution for: ${userEmail}, plan: ${planId}, subscription: ${subscriptionId}`);

    // Get plan name
    const planNames = {
      'vip': 'VIP Plan',
      'starter': 'Starter Plan'
    };
    const planName = planNames[planId as keyof typeof planNames] || planId;

    // Test the distribution function
    await distributeInitialTicTokens(userEmail, planId, planName, subscriptionId);

    return NextResponse.json({
      success: true,
      message: 'Initial TIC distribution completed successfully',
      details: {
        userEmail,
        planId,
        planName,
        subscriptionId,
        dailyTokens: getDailyTokenAmount(planId),
        distributionDate: new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error in immediate TIC distribution test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check if immediate distribution is needed for user's subscriptions
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

    const userEmail = session.user.email;
    const today = new Date().toISOString().split('T')[0];

    console.log(`🔍 Checking immediate distribution status for: ${userEmail}`);

    // Get user's active subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Check which subscriptions need immediate distribution
    const needsDistribution = [];
    const hasDistribution = [];

    for (const subscription of subscriptions || []) {
      const { data: existingDistribution } = await supabaseAdmin
        .from('token_distributions')
        .select('id, distribution_date, token_amount')
        .eq('user_email', userEmail)
        .eq('subscription_id', subscription.id)
        .eq('distribution_date', today)
        .single();

      if (existingDistribution) {
        hasDistribution.push({
          subscription_id: subscription.id,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          distribution: existingDistribution
        });
      } else {
        needsDistribution.push({
          subscription_id: subscription.id,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          daily_tokens: getDailyTokenAmount(subscription.plan_id)
        });
      }
    }

    return NextResponse.json({
      success: true,
      userEmail,
      date: today,
      total_subscriptions: subscriptions?.length || 0,
      needs_distribution: needsDistribution,
      has_distribution: hasDistribution,
      summary: {
        needs_count: needsDistribution.length,
        has_count: hasDistribution.length
      }
    });

  } catch (error) {
    console.error('Error checking immediate distribution status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
