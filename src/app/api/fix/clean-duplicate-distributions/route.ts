import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Token allocation per plan (yearly amounts)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
} as const;

// Calculate daily token amount (yearly amount / 365 days)
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365;
};

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 CLEANING DUPLICATE DISTRIBUTIONS AND FIXING AMOUNTS...');

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Cleaning distributions for: ${today}`);

    // Step 1: Get all users with distributions today
    const { data: todayDistributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('distribution_date', today);

    if (distError) {
      throw new Error(`Failed to fetch distributions: ${distError.message}`);
    }

    console.log(`📊 Found ${todayDistributions?.length || 0} distributions for today`);

    // Step 2: Get all wallet transactions for today
    const { data: todayTransactions, error: transError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('transaction_type', 'daily_distribution')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (transError) {
      console.error('⚠️ Error fetching transactions:', transError);
    }

    console.log(`💰 Found ${todayTransactions?.length || 0} wallet transactions for today`);

    // Step 3: Group by user to find duplicates
    const distributionsByUser = (todayDistributions || []).reduce((acc: any, dist: any) => {
      if (!acc[dist.user_email]) {
        acc[dist.user_email] = [];
      }
      acc[dist.user_email].push(dist);
      return acc;
    }, {});

    const transactionsByUser = (todayTransactions || []).reduce((acc: any, trans: any) => {
      if (!acc[trans.user_email]) {
        acc[trans.user_email] = [];
      }
      acc[trans.user_email].push(trans);
      return acc;
    }, {});

    // Step 4: Calculate what each user should have received
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    const subscriptionsByUser = (activeSubscriptions || []).reduce((acc: any, sub: any) => {
      if (!acc[sub.user_email]) {
        acc[sub.user_email] = [];
      }
      acc[sub.user_email].push(sub);
      return acc;
    }, {});

    // Step 5: Delete ALL existing distributions and transactions for today
    console.log('🗑️ Deleting all existing distributions for today...');
    const { error: deleteDistError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .eq('distribution_date', today);

    if (deleteDistError) {
      console.error('⚠️ Error deleting distributions:', deleteDistError);
    }

    console.log('🗑️ Deleting all existing wallet transactions for today...');
    const { error: deleteTransError } = await supabaseAdmin
      .from('wallet_transactions')
      .delete()
      .eq('transaction_type', 'daily_distribution')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (deleteTransError) {
      console.error('⚠️ Error deleting transactions:', deleteTransError);
    }

    // Step 6: Reset all user TIC balances to what they were before today's distributions
    console.log('🔄 Resetting user TIC balances...');
    const balanceResets = [];

    for (const userEmail of Object.keys(transactionsByUser)) {
      const userTransactions = transactionsByUser[userEmail];
      const totalIncorrectAmount = userTransactions.reduce((sum: number, trans: any) => 
        sum + parseFloat(trans.amount), 0);

      if (totalIncorrectAmount > 0) {
        // Get current balance
        const { data: wallet } = await supabaseAdmin
          .from('user_wallets')
          .select('tic_balance')
          .eq('user_email', userEmail)
          .single();

        if (wallet) {
          const currentBalance = parseFloat(wallet.tic_balance) || 0;
          const correctedBalance = currentBalance - totalIncorrectAmount;

          // Update balance
          const { error: balanceError } = await supabaseAdmin
            .from('user_wallets')
            .update({ 
              tic_balance: Math.max(0, correctedBalance),
              last_updated: new Date().toISOString()
            })
            .eq('user_email', userEmail);

          if (balanceError) {
            console.error(`⚠️ Error resetting balance for ${userEmail}:`, balanceError);
          } else {
            console.log(`✅ Reset balance for ${userEmail}: ${currentBalance} -> ${Math.max(0, correctedBalance)} (-${totalIncorrectAmount})`);
            balanceResets.push({
              user_email: userEmail,
              old_balance: currentBalance,
              new_balance: Math.max(0, correctedBalance),
              amount_removed: totalIncorrectAmount
            });
          }
        }
      }
    }

    // Step 7: Create correct single distributions for each user
    console.log('✨ Creating correct single distributions...');
    const correctDistributions = [];

    for (const userEmail of Object.keys(subscriptionsByUser)) {
      const userSubscriptions = subscriptionsByUser[userEmail];
      
      // Calculate correct daily amount
      let totalDailyTokens = 0;
      const planNames: string[] = [];

      for (const subscription of userSubscriptions) {
        const dailyTokens = getDailyTokenAmount(subscription.plan_id);
        if (dailyTokens > 0) {
          totalDailyTokens += dailyTokens;
          if (!planNames.includes(subscription.plan_name)) {
            planNames.push(subscription.plan_name);
          }
        }
      }

      if (totalDailyTokens <= 0) {
        console.log(`⚠️ Skipping ${userEmail} - no token allocation`);
        continue;
      }

      // Use primary subscription for the record
      const primarySubscription = userSubscriptions[0];

      // Create correct distribution
      const distributionTime = new Date();
      distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

      const { data: distribution, error: distError } = await supabaseAdmin
        .from('token_distributions')
        .insert({
          user_email: userEmail,
          subscription_id: primarySubscription.id,
          plan_id: primarySubscription.plan_id,
          plan_name: planNames.length > 1 ? planNames.join(' + ') : planNames[0],
          token_amount: totalDailyTokens,
          distribution_date: today,
          status: 'completed',
          created_at: distributionTime.toISOString()
        })
        .select()
        .single();

      if (distError) {
        console.error(`❌ Error creating distribution for ${userEmail}:`, distError);
      } else {
        console.log(`✅ Created correct distribution for ${userEmail}: ${totalDailyTokens.toFixed(4)} TIC`);
        
        // Update wallet balance with correct amount
        const { error: walletError } = await supabaseAdmin.rpc('increment_tic_balance_daily_distribution', {
          p_user_email: userEmail,
          p_amount: totalDailyTokens
        });

        if (walletError) {
          console.error(`⚠️ Wallet update failed for ${userEmail}:`, walletError);
        } else {
          console.log(`💰 Updated wallet balance for ${userEmail}: +${totalDailyTokens.toFixed(4)} TIC`);
        }

        correctDistributions.push({
          user_email: userEmail,
          correct_amount: totalDailyTokens,
          plans: planNames.join(' + '),
          distribution_id: distribution.id
        });
      }
    }

    console.log('🎉 CLEANUP AND FIX COMPLETED!');

    return NextResponse.json({
      success: true,
      message: `Cleaned duplicate distributions and fixed amounts for ${today}`,
      date: today,
      summary: {
        original_distributions_deleted: todayDistributions?.length || 0,
        original_transactions_deleted: todayTransactions?.length || 0,
        balance_resets: balanceResets.length,
        correct_distributions_created: correctDistributions.length
      },
      balance_resets: balanceResets,
      correct_distributions: correctDistributions,
      expected_amounts: {
        vip_daily: getDailyTokenAmount('vip'),
        starter_daily: getDailyTokenAmount('starter')
      }
    });

  } catch (error) {
    console.error('❌ CLEANUP ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
