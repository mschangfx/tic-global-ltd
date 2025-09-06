import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all distributions for today
    const { data: todayDistributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('distribution_date', today)
      .order('created_at', { ascending: false });

    if (distError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch distributions',
        details: distError.message
      }, { status: 500 });
    }

    // Get wallet transactions for today
    const { data: todayTransactions, error: transError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('transaction_type', 'daily_distribution')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .order('created_at', { ascending: false });

    if (transError) {
      console.error('Error fetching transactions:', transError);
    }

    // Group distributions by user
    const distributionsByUser = todayDistributions?.reduce((acc: any, dist: any) => {
      if (!acc[dist.user_email]) {
        acc[dist.user_email] = [];
      }
      acc[dist.user_email].push(dist);
      return acc;
    }, {}) || {};

    // Group transactions by user
    const transactionsByUser = todayTransactions?.reduce((acc: any, trans: any) => {
      if (!acc[trans.user_email]) {
        acc[trans.user_email] = [];
      }
      acc[trans.user_email].push(trans);
      return acc;
    }, {}) || {};

    // Analyze the data
    const analysis = Object.keys(distributionsByUser).map(userEmail => {
      const userDistributions = distributionsByUser[userEmail];
      const userTransactions = transactionsByUser[userEmail] || [];
      
      const totalDistributionAmount = userDistributions.reduce((sum: number, dist: any) => 
        sum + parseFloat(dist.token_amount), 0);
      
      const totalTransactionAmount = userTransactions.reduce((sum: number, trans: any) => 
        sum + parseFloat(trans.amount), 0);

      return {
        user_email: userEmail,
        distribution_count: userDistributions.length,
        transaction_count: userTransactions.length,
        total_distribution_amount: totalDistributionAmount,
        total_transaction_amount: totalTransactionAmount,
        distributions: userDistributions.map((dist: any) => ({
          id: dist.id,
          plan_id: dist.plan_id,
          token_amount: dist.token_amount,
          created_at: dist.created_at
        })),
        transactions: userTransactions.map((trans: any) => ({
          id: trans.id,
          transaction_id: trans.transaction_id,
          amount: trans.amount,
          description: trans.description,
          created_at: trans.created_at
        }))
      };
    });

    // Find users with multiple distributions (the problem)
    const usersWithMultipleDistributions = analysis.filter(user => user.distribution_count > 1);
    const usersWithExcessiveAmounts = analysis.filter(user => 
      user.total_distribution_amount > 25 || user.total_transaction_amount > 25
    );

    return NextResponse.json({
      success: true,
      date: today,
      summary: {
        total_distributions: todayDistributions?.length || 0,
        total_transactions: todayTransactions?.length || 0,
        unique_users: Object.keys(distributionsByUser).length,
        users_with_multiple_distributions: usersWithMultipleDistributions.length,
        users_with_excessive_amounts: usersWithExcessiveAmounts.length
      },
      problem_users: usersWithExcessiveAmounts,
      all_users_analysis: analysis,
      raw_distributions: todayDistributions?.slice(0, 20), // First 20 for debugging
      raw_transactions: todayTransactions?.slice(0, 20) // First 20 for debugging
    });

  } catch (error) {
    console.error('Error in distribution amounts debug:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
