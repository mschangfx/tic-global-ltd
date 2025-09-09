import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TOKEN_PRICES } from '@/lib/constants/tokens';

// COMPREHENSIVE TIC BALANCE SYNC: Update all users' TIC balances and reflect USD value in total balance
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 COMPREHENSIVE TIC SYNC: Starting sync for all users...');
    
    const currentTime = new Date().toISOString();
    const TIC_PRICE = TOKEN_PRICES.TIC; // $0.02 per TIC
    
    const results = [];
    
    // Get all users who have TIC distributions
    const { data: usersWithDistributions, error: usersError } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email')
      .neq('user_email', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!usersWithDistributions || usersWithDistributions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with TIC distributions found',
        synced_count: 0,
        timestamp: currentTime
      });
    }

    // Get unique user emails
    const userEmailSet = new Set(usersWithDistributions.map(u => u.user_email));
    const uniqueUsers = Array.from(userEmailSet);
    console.log(`📋 Found ${uniqueUsers.length} unique users with TIC distributions`);

    // Process each user
    for (const userEmail of uniqueUsers) {
      try {
        console.log(`🔄 Processing user: ${userEmail}`);

        // Calculate total TIC earned from distributions
        const { data: distributions, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .select('token_amount')
          .eq('user_email', userEmail)
          .eq('status', 'completed');

        if (distError) {
          console.warn(`⚠️ Error fetching distributions for ${userEmail}:`, distError);
          results.push({
            user_email: userEmail,
            status: 'error',
            error: `Failed to fetch distributions: ${distError.message}`
          });
          continue;
        }

        const totalTicEarned = distributions?.reduce((sum, dist) => {
          return sum + parseFloat(dist.token_amount.toString());
        }, 0) || 0;

        console.log(`📊 ${userEmail}: Total TIC earned = ${totalTicEarned}`);

        // Get current wallet data
        const { data: wallet, error: walletError } = await supabaseAdmin
          .from('user_wallets')
          .select('total_balance, tic_balance, gic_balance, staking_balance, partner_wallet_balance')
          .eq('user_email', userEmail)
          .single();

        if (walletError) {
          console.warn(`⚠️ Error fetching wallet for ${userEmail}:`, walletError);
          results.push({
            user_email: userEmail,
            status: 'error',
            error: `Failed to fetch wallet: ${walletError.message}`
          });
          continue;
        }

        const currentTicBalance = parseFloat(wallet.tic_balance.toString()) || 0;
        const currentTotalBalance = parseFloat(wallet.total_balance.toString()) || 0;

        // Check if sync is needed
        if (Math.abs(currentTicBalance - totalTicEarned) < 0.001) {
          console.log(`✅ ${userEmail}: TIC balance already in sync`);
          results.push({
            user_email: userEmail,
            status: 'already_synced',
            tic_balance: currentTicBalance,
            total_earned: totalTicEarned
          });
          continue;
        }

        // Calculate USD values and balance adjustment
        const newTicUsdValue = totalTicEarned * TIC_PRICE;
        const currentTicUsdValue = currentTicBalance * TIC_PRICE;
        const balanceAdjustment = newTicUsdValue - currentTicUsdValue;
        const newTotalBalance = currentTotalBalance + balanceAdjustment;

        console.log(`💰 ${userEmail}: TIC ${currentTicBalance} → ${totalTicEarned} | USD adjustment: ${balanceAdjustment.toFixed(4)}`);

        // Update wallet with new TIC balance and adjusted total balance
        const { error: updateError } = await supabaseAdmin
          .from('user_wallets')
          .update({
            tic_balance: totalTicEarned,
            total_balance: newTotalBalance,
            last_updated: new Date().toISOString()
          })
          .eq('user_email', userEmail);

        if (updateError) {
          console.error(`❌ Error updating wallet for ${userEmail}:`, updateError);
          results.push({
            user_email: userEmail,
            status: 'update_failed',
            error: `Failed to update wallet: ${updateError.message}`
          });
          continue;
        }

        results.push({
          user_email: userEmail,
          status: 'synced',
          previous_tic_balance: currentTicBalance,
          new_tic_balance: totalTicEarned,
          tic_difference: totalTicEarned - currentTicBalance,
          tic_usd_value: newTicUsdValue,
          balance_adjustment: balanceAdjustment,
          previous_total_balance: currentTotalBalance,
          new_total_balance: newTotalBalance,
          distribution_count: distributions?.length || 0
        });

        console.log(`✅ ${userEmail}: Successfully synced TIC balance and wallet total`);

      } catch (error) {
        console.error(`❌ Error processing ${userEmail}:`, error);
        results.push({
          user_email: userEmail,
          status: 'error',
          error: error instanceof Error ? (error as Error).message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'synced').length;
    const alreadySyncedCount = results.filter(r => r.status === 'already_synced').length;
    const errorCount = results.filter(r => r.status === 'error' || r.status === 'update_failed').length;

    console.log(`🎉 TIC balance sync completed: ${successCount} synced, ${alreadySyncedCount} already synced, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `TIC balance sync completed: ${successCount} synced, ${alreadySyncedCount} already synced, ${errorCount} errors`,
      tic_price: TIC_PRICE,
      summary: {
        total_users: uniqueUsers.length,
        synced: successCount,
        already_synced: alreadySyncedCount,
        errors: errorCount
      },
      results: results,
      timestamp: currentTime
    });

  } catch (error) {
    console.error('❌ TIC balance sync failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'TIC balance sync failed',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check TIC balance sync status for all users
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking TIC balance sync status for all users...');
    
    const TIC_PRICE = TOKEN_PRICES.TIC;
    
    // Get all users with TIC distributions and their wallet data
    const { data: syncStatus, error: statusError } = await supabaseAdmin
      .from('user_wallets')
      .select(`
        user_email,
        total_balance,
        tic_balance,
        gic_balance,
        staking_balance,
        last_updated
      `)
      .gt('tic_balance', 0);

    if (statusError) {
      throw new Error(`Failed to fetch sync status: ${statusError.message}`);
    }

    const analysis = syncStatus?.map(wallet => {
      const ticBalance = parseFloat(wallet.tic_balance.toString());
      const totalBalance = parseFloat(wallet.total_balance.toString());
      const ticUsdValue = ticBalance * TIC_PRICE;
      const gicBalance = parseFloat(wallet.gic_balance.toString()) || 0;
      const stakingBalance = parseFloat(wallet.staking_balance.toString()) || 0;
      
      // Calculate expected total if TIC USD value is properly included
      const expectedTokenValue = ticUsdValue + gicBalance + stakingBalance;
      
      return {
        user_email: wallet.user_email,
        tic_balance: ticBalance,
        tic_usd_value: ticUsdValue,
        total_balance: totalBalance,
        expected_token_value: expectedTokenValue,
        includes_tic_value: Math.abs(totalBalance - expectedTokenValue) < 100, // Allow for deposits/withdrawals
        last_updated: wallet.last_updated
      };
    }) || [];

    const needsSync = analysis.filter(a => !a.includes_tic_value);
    const alreadySynced = analysis.filter(a => a.includes_tic_value);

    return NextResponse.json({
      success: true,
      tic_price: TIC_PRICE,
      summary: {
        total_users_with_tic: analysis.length,
        needs_sync: needsSync.length,
        already_synced: alreadySynced.length
      },
      users_needing_sync: needsSync,
      users_already_synced: alreadySynced.slice(0, 5), // Show first 5 as example
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TIC sync status check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'TIC sync status check failed',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
