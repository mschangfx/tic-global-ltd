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

// GET - Debug TIC distribution system
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

    console.log(`🔍 Debug TIC distribution for user: ${userEmail} on ${today}`);

    // 1. Check user's active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    // 2. Check user's wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // 3. Check today's distributions
    const { data: todayDistributions, error: todayError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('distribution_date', today);

    // 4. Check recent distributions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentDistributions, error: recentError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .gte('distribution_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('distribution_date', { ascending: false });

    // 5. Check wallet transactions (TIC related)
    const { data: ticTransactions, error: transError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('currency', 'TIC')
      .order('created_at', { ascending: false })
      .limit(10);

    // 6. Calculate expected vs actual tokens
    let expectedTokens = 0;
    let calculatedDailyAmounts: any[] = [];

    if (activeSubscriptions) {
      for (const sub of activeSubscriptions) {
        const dailyAmount = getDailyTokenAmount(sub.plan_id);
        const startDate = new Date(sub.start_date);
        const daysSinceStart = Math.max(0, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const expectedForSub = daysSinceStart * dailyAmount;
        
        expectedTokens += expectedForSub;
        calculatedDailyAmounts.push({
          subscription_id: sub.id,
          plan_id: sub.plan_id,
          plan_name: sub.plan_name,
          daily_amount: dailyAmount,
          days_since_start: daysSinceStart,
          expected_total: expectedForSub,
          start_date: sub.start_date
        });
      }
    }

    const actualTokensReceived = recentDistributions?.reduce((sum, dist) => sum + parseFloat(dist.token_amount.toString()), 0) || 0;

    // 7. Check database function exists
    let functionExists = null;
    let funcError = null;
    try {
      const { data, error } = await supabaseAdmin.rpc('increment_tic_balance_daily_distribution', {
        user_email_param: 'test@example.com',
        amount_param: 0.01,
        transaction_id_param: 'debug_test_' + Date.now(),
        description_param: 'Debug test - this should be rolled back',
        plan_type_param: 'debug'
      });
      functionExists = { exists: true, error: null };
      funcError = error;
    } catch (error) {
      functionExists = { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      funcError = error instanceof Error ? error : new Error('Unknown error');
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        user_email: userEmail,
        date: today,
        active_subscriptions: {
          count: activeSubscriptions?.length || 0,
          subscriptions: activeSubscriptions || [],
          error: subsError?.message
        },
        wallet: {
          exists: !!wallet,
          tic_balance: wallet?.tic_balance || 0,
          total_balance: wallet?.total_balance || 0,
          last_updated: wallet?.last_updated,
          error: walletError?.message
        },
        today_distributions: {
          count: todayDistributions?.length || 0,
          distributions: todayDistributions || [],
          error: todayError?.message
        },
        recent_distributions: {
          count: recentDistributions?.length || 0,
          distributions: recentDistributions || [],
          error: recentError?.message
        },
        tic_transactions: {
          count: ticTransactions?.length || 0,
          transactions: ticTransactions || [],
          error: transError?.message
        },
        token_calculations: {
          daily_amounts: calculatedDailyAmounts,
          expected_tokens_total: expectedTokens,
          actual_tokens_received: actualTokensReceived,
          difference: expectedTokens - actualTokensReceived
        },
        database_function: {
          exists: functionExists?.exists || false,
          error: functionExists?.error
        },
        token_allocations: TOKEN_ALLOCATIONS
      }
    });

  } catch (error) {
    console.error('Error in TIC distribution debug:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
