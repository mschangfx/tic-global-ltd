import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TOKEN_PRICES } from '@/lib/constants/tokens';

// Token allocation per plan (yearly amounts)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
} as const;

// Calculate daily token amount (yearly amount / 365 days)
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // VIP: 18.904109589, Starter: 1.369863014
};

// POST - Fix missing TIC distributions for all users with multiple active subscriptions
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting comprehensive fix for missing TIC distributions...');

    // Step 1: Get all users with active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_email, id, plan_id, plan_name, start_date, end_date')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('user_email');

    if (subsError) {
      console.error('❌ Error fetching active subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch active subscriptions' },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${activeSubscriptions.length} active subscriptions`);

    // Group subscriptions by user
    const subscriptionsByUser = activeSubscriptions.reduce((acc, sub) => {
      if (!acc[sub.user_email]) {
        acc[sub.user_email] = [];
      }
      acc[sub.user_email].push(sub);
      return acc;
    }, {} as Record<string, typeof activeSubscriptions>);

    const uniqueUsers = Object.keys(subscriptionsByUser);
    console.log(`👥 Found ${uniqueUsers.length} users with active subscriptions`);

    // Step 2: Identify users with missing distributions
    const usersWithMissingDistributions = [];
    
    for (const userEmail of uniqueUsers) {
      const userSubscriptions = subscriptionsByUser[userEmail];
      
      // Check distributions for today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayDistributions, error: distError } = await supabaseAdmin
        .from('token_distributions')
        .select('subscription_id, plan_id, token_amount')
        .eq('user_email', userEmail)
        .eq('distribution_date', today)
        .eq('status', 'completed');

      if (distError) {
        console.error(`❌ Error checking distributions for ${userEmail}:`, distError);
        continue;
      }

      const distributedSubscriptions = new Set(todayDistributions?.map(d => d.subscription_id) || []);
      const missingSubscriptions = userSubscriptions.filter(sub => !distributedSubscriptions.has(sub.id));

      if (missingSubscriptions.length > 0) {
        console.log(`🚨 ${userEmail}: ${missingSubscriptions.length}/${userSubscriptions.length} subscriptions missing distributions`);
        usersWithMissingDistributions.push({
          user_email: userEmail,
          total_subscriptions: userSubscriptions.length,
          missing_subscriptions: missingSubscriptions.length,
          missing_subs: missingSubscriptions
        });
      }
    }

    console.log(`🎯 Found ${usersWithMissingDistributions.length} users with missing distributions`);

    // Step 3: Create missing distributions for the last 7 days
    const distributionDates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      distributionDates.push(date.toISOString().split('T')[0]);
    }

    const backfillResults = [];
    let totalCreated = 0;

    for (const userInfo of usersWithMissingDistributions) {
      const { user_email, missing_subs } = userInfo;
      
      for (const subscription of missing_subs) {
        for (const distributionDate of distributionDates) {
          // Check if distribution already exists
          const { data: existingDist, error: checkError } = await supabaseAdmin
            .from('token_distributions')
            .select('id')
            .eq('user_email', user_email)
            .eq('subscription_id', subscription.id)
            .eq('distribution_date', distributionDate)
            .maybeSingle();

          if (checkError) {
            console.error(`❌ Error checking distribution for ${user_email}:`, checkError);
            continue;
          }

          if (!existingDist) {
            // Missing distribution - create it
            const dailyTokens = getDailyTokenAmount(subscription.plan_id);
            
            console.log(`📝 Creating missing distribution: ${user_email} - ${subscription.plan_id} - ${distributionDate} (${dailyTokens} TIC)`);

            // Create distribution record
            const { error: createError } = await supabaseAdmin
              .from('token_distributions')
              .insert({
                user_email: user_email,
                subscription_id: subscription.id,
                plan_id: subscription.plan_id,
                plan_name: subscription.plan_name,
                token_amount: dailyTokens,
                distribution_date: distributionDate,
                status: 'completed',
                created_at: new Date().toISOString()
              });

            if (createError) {
              console.error(`❌ Error creating distribution for ${user_email}:`, createError);
              backfillResults.push({
                user_email: user_email,
                subscription_id: subscription.id,
                plan_id: subscription.plan_id,
                distribution_date: distributionDate,
                status: 'error',
                error: createError.message
              });
            } else {
              totalCreated++;
              backfillResults.push({
                user_email: user_email,
                subscription_id: subscription.id,
                plan_id: subscription.plan_id,
                distribution_date: distributionDate,
                token_amount: dailyTokens,
                status: 'created'
              });
            }
          }
        }
      }
    }

    console.log(`📝 Backfill completed: ${totalCreated} distributions created`);

    // Step 4: Update wallet balances for affected users
    const walletUpdateResults = [];
    const TIC_PRICE = TOKEN_PRICES.TIC; // $0.02 per TIC

    for (const userInfo of usersWithMissingDistributions) {
      const { user_email } = userInfo;
      
      try {
        console.log(`💰 Updating wallet balance for: ${user_email}`);

        // Get total TIC earned from ALL distributions
        const { data: distributions, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .select('token_amount')
          .eq('user_email', user_email)
          .eq('status', 'completed');

        if (distError) {
          console.error(`❌ Error fetching distributions for ${user_email}:`, distError);
          continue;
        }

        const totalTicEarned = distributions?.reduce((sum, dist) => {
          return sum + parseFloat(dist.token_amount.toString());
        }, 0) || 0;

        // Get current wallet data
        const { data: currentWallet, error: walletError } = await supabaseAdmin
          .from('user_wallets')
          .select('tic_balance, total_balance')
          .eq('user_email', user_email)
          .single();

        if (walletError) {
          console.error(`❌ Error fetching wallet for ${user_email}:`, walletError);
          continue;
        }

        const currentTicBalance = parseFloat(currentWallet.tic_balance.toString()) || 0;
        const currentTotalBalance = parseFloat(currentWallet.total_balance.toString()) || 0;

        // Calculate USD values and balance adjustment
        const newTicUsdValue = totalTicEarned * TIC_PRICE;
        const currentTicUsdValue = currentTicBalance * TIC_PRICE;
        const balanceAdjustment = newTicUsdValue - currentTicUsdValue;
        const newTotalBalance = currentTotalBalance + balanceAdjustment;

        console.log(`💰 ${user_email}: TIC ${currentTicBalance} → ${totalTicEarned} | USD adjustment: ${balanceAdjustment.toFixed(4)}`);

        // Update wallet
        const { error: updateError } = await supabaseAdmin
          .from('user_wallets')
          .update({
            tic_balance: totalTicEarned,
            total_balance: newTotalBalance,
            last_updated: new Date().toISOString()
          })
          .eq('user_email', user_email);

        if (updateError) {
          console.error(`❌ Error updating wallet for ${user_email}:`, updateError);
          walletUpdateResults.push({
            user_email: user_email,
            status: 'error',
            error: updateError.message
          });
        } else {
          walletUpdateResults.push({
            user_email: user_email,
            status: 'updated',
            old_tic_balance: currentTicBalance,
            new_tic_balance: totalTicEarned,
            tic_difference: totalTicEarned - currentTicBalance,
            balance_adjustment: balanceAdjustment
          });
          console.log(`✅ ${user_email}: Wallet updated successfully`);
        }

      } catch (error) {
        console.error(`❌ Error updating wallet for ${user_email}:`, error);
        walletUpdateResults.push({
          user_email: user_email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const walletsUpdated = walletUpdateResults.filter(r => r.status === 'updated').length;
    console.log(`🎉 Fix completed: ${totalCreated} distributions created, ${walletsUpdated} wallets updated`);

    return NextResponse.json({
      success: true,
      message: 'Missing TIC distributions fix completed',
      summary: {
        total_users_checked: uniqueUsers.length,
        users_with_missing_distributions: usersWithMissingDistributions.length,
        distributions_created: totalCreated,
        wallets_updated: walletsUpdated,
        tic_price: TIC_PRICE
      },
      users_with_missing_distributions: usersWithMissingDistributions,
      backfill_results: {
        total_processed: backfillResults.length,
        created: totalCreated,
        errors: backfillResults.filter(r => r.status === 'error').length
      },
      wallet_updates: walletUpdateResults
    });

  } catch (error) {
    console.error('❌ Error in missing distributions fix:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
