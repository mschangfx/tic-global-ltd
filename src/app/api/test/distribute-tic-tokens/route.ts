import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Token allocation per plan (yearly amounts)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
};

// Calculate daily token amount (yearly amount / 365 days)
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // Exact value without rounding
};

// POST - Test endpoint to distribute TIC tokens to current user
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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`🧪 Testing TIC distribution for user: ${userEmail}`);

    // Get user's active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    if (subsError) {
      console.error('Error fetching user subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch user subscriptions' },
        { status: 500 }
      );
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active subscriptions found for user',
        userEmail,
        subscriptions: []
      });
    }

    const results = [];

    for (const subscription of activeSubscriptions) {
      const dailyTokens = getDailyTokenAmount(subscription.plan_id);
      
      if (dailyTokens <= 0) {
        console.log(`No token allocation for plan: ${subscription.plan_id}`);
        results.push({
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          status: 'skipped',
          reason: 'No token allocation for this plan'
        });
        continue;
      }

      // Check if tokens were already distributed today for this subscription
      const { data: existingDistribution } = await supabaseAdmin
        .from('token_distributions')
        .select('id')
        .eq('user_email', userEmail)
        .eq('subscription_id', subscription.id)
        .eq('distribution_date', today)
        .single();

      if (existingDistribution) {
        console.log(`Tokens already distributed today for ${userEmail} (${subscription.plan_name})`);
        results.push({
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          status: 'already_distributed',
          reason: 'Tokens already distributed today'
        });
        continue;
      }

      // Create token distribution record
      const { data: distribution, error: distError } = await supabaseAdmin
        .from('token_distributions')
        .insert({
          user_email: userEmail,
          subscription_id: subscription.id,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          token_amount: dailyTokens,
          distribution_date: today,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (distError) {
        console.error(`Error creating distribution record:`, distError);
        results.push({
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          status: 'error',
          reason: 'Failed to create distribution record',
          error: distError.message
        });
        continue;
      }

      // Update user's TIC token balance using RPC function with transaction history
      const transactionId = `test_daily_tic_${subscription.plan_id}_${today}_${subscription.id}`;
      const description = `Test Daily TIC Distribution - ${subscription.plan_name} (${dailyTokens} TIC)`;

      const { error: walletError } = await supabaseAdmin
        .rpc('increment_tic_balance_daily_distribution', {
          user_email_param: userEmail,
          amount_param: dailyTokens,
          transaction_id_param: transactionId,
          description_param: description,
          plan_type_param: subscription.plan_id
        });

      if (walletError) {
        console.error(`Error updating TIC balance:`, walletError);
        results.push({
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          status: 'error',
          reason: 'Failed to update TIC balance',
          error: walletError.message
        });
        continue;
      }

      console.log(`✅ Test: Distributed ${dailyTokens} TIC to ${userEmail} (${subscription.plan_name})`);
      results.push({
        plan_id: subscription.plan_id,
        plan_name: subscription.plan_name,
        tokens_distributed: dailyTokens,
        transaction_id: transactionId,
        status: 'success'
      });
    }

    // Get updated wallet balance
    const { data: updatedWallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('tic_balance, gic_balance, partner_wallet_balance, total_balance')
      .eq('user_email', userEmail)
      .single();

    return NextResponse.json({
      success: true,
      message: `Test TIC distribution completed for ${userEmail}`,
      userEmail,
      date: today,
      subscriptions: activeSubscriptions.length,
      results,
      updatedWallet: updatedWallet || null,
      note: 'This is a test distribution. Check your wallet balance in the navbar dropdown.',
      debug: {
        message: 'Distribution completed for current session user',
        userEmail: userEmail,
        distributionsProcessed: results.length,
        successfulDistributions: results.filter(r => r.status === 'success').length
      }
    });

  } catch (error) {
    console.error('Error in test TIC distribution:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check current user's wallet balance and distribution history
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

    // Get wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Get recent distributions
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get active subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active');

    return NextResponse.json({
      userEmail,
      wallet: wallet || null,
      recentDistributions: distributions || [],
      activeSubscriptions: subscriptions || [],
      totalDistributions: distributions?.length || 0,
      debug: {
        message: 'This shows the actual database values',
        walletExists: !!wallet,
        ticBalance: wallet?.tic_balance || 0,
        gicBalance: wallet?.gic_balance || 0,
        partnerBalance: wallet?.partner_wallet_balance || 0
      }
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
