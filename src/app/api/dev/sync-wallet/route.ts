import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Sync wallet balance for any user (DEVELOPMENT ONLY)
export async function POST(request: NextRequest) {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log(`[DEV] Syncing wallet for: ${userEmail}`);

    // Calculate total deposits
    const { data: deposits, error: depositError } = await supabaseAdmin
      .from('deposits')
      .select('amount, final_amount')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (depositError) {
      console.error('Error fetching deposits:', depositError);
      return NextResponse.json(
        { error: 'Failed to fetch deposits' },
        { status: 500 }
      );
    }

    // Calculate total withdrawals
    const { data: withdrawals, error: withdrawalError } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('amount, final_amount')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (withdrawalError) {
      console.error('Error fetching withdrawals:', withdrawalError);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      );
    }

    // Calculate transactions (including test deposits)
    const { data: transactions, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select('amount, transaction_type')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Calculate payment transactions (plan purchases)
    const { data: paymentTransactions, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .select('amount')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (paymentError) {
      console.error('Error fetching payment transactions:', paymentError);
      return NextResponse.json(
        { error: 'Failed to fetch payment transactions' },
        { status: 500 }
      );
    }

    // Calculate balances
    const totalDeposits = deposits?.reduce((sum, deposit) => {
      return sum + (parseFloat(deposit.final_amount) || parseFloat(deposit.amount) || 0);
    }, 0) || 0;

    const totalWithdrawals = withdrawals?.reduce((sum, withdrawal) => {
      return sum + (parseFloat(withdrawal.final_amount) || parseFloat(withdrawal.amount) || 0);
    }, 0) || 0;

    // Calculate transaction amounts (deposits are positive, withdrawals are negative)
    const transactionDeposits = transactions?.reduce((sum, transaction) => {
      if (transaction.transaction_type === 'deposit') {
        return sum + (parseFloat(transaction.amount) || 0);
      }
      return sum;
    }, 0) || 0;

    const transactionWithdrawals = transactions?.reduce((sum, transaction) => {
      if (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'payment') {
        return sum + (parseFloat(transaction.amount) || 0);
      }
      return sum;
    }, 0) || 0;

    // Calculate payment transaction amounts (plan purchases - these are withdrawals)
    const paymentTransactionWithdrawals = paymentTransactions?.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0) || 0;

    const calculatedBalance = totalDeposits + transactionDeposits - totalWithdrawals - transactionWithdrawals - paymentTransactionWithdrawals;

    console.log('💰 Calculated balance:', {
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      transactionDeposits: transactionDeposits,
      transactionWithdrawals: transactionWithdrawals,
      paymentTransactionWithdrawals: paymentTransactionWithdrawals,
      balance: calculatedBalance
    });

    // Get current wallet to preserve token balances
    const { data: currentWallet, error: currentWalletError } = await supabaseAdmin
      .from('user_wallets')
      .select('tic_balance, gic_balance, staking_balance, referral_earnings_balance')
      .eq('user_email', userEmail)
      .single();

    console.log('🔍 Current wallet before sync:', currentWallet);
    if (currentWalletError) {
      console.error('Error fetching current wallet:', currentWalletError);
    }

    // Prepare update data
    const updateData = {
      total_balance: calculatedBalance,
      tic_balance: currentWallet?.tic_balance || 0,
      gic_balance: currentWallet?.gic_balance || 0,
      staking_balance: currentWallet?.staking_balance || 0,
      referral_earnings_balance: currentWallet?.referral_earnings_balance || 0,
      last_updated: new Date().toISOString()
    };

    console.log('🔧 Update data being sent:', updateData);

    // Update only the total_balance and last_updated, leave token balances untouched
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from('user_wallets')
      .update({
        total_balance: calculatedBalance,
        last_updated: new Date().toISOString()
      })
      .eq('user_email', userEmail)
      .select()
      .single();

    console.log('✅ Updated wallet result:', updatedWallet);
    if (updateError) {
      console.error('❌ Update error:', updateError);
    }

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return NextResponse.json(
        { error: 'Failed to update wallet' },
        { status: 500 }
      );
    }

    // Get the final wallet state with all balances
    const { data: finalWallet, error: finalWalletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (finalWalletError) {
      console.error('Error fetching final wallet state:', finalWalletError);
    }

    console.log('✅ Wallet synced successfully:', finalWallet || updatedWallet);

    const walletToReturn = finalWallet || updatedWallet;

    return NextResponse.json({
      success: true,
      message: `Wallet synced successfully for ${userEmail}`,
      wallet: {
        total_balance: calculatedBalance,
        tic_balance: walletToReturn.tic_balance || 0,
        gic_balance: walletToReturn.gic_balance || 0,
        staking_balance: walletToReturn.staking_balance || 0,
        last_updated: walletToReturn.last_updated
      },
      calculation: {
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        transaction_deposits: transactionDeposits,
        transaction_withdrawals: transactionWithdrawals,
        payment_transaction_withdrawals: paymentTransactionWithdrawals,
        calculated_balance: calculatedBalance
      },
      debug: {
        current_wallet_before_sync: currentWallet,
        current_wallet_error: currentWalletError?.message || null,
        preserved_tic_balance: currentWallet?.tic_balance || 0,
        update_data_sent: {
          total_balance: calculatedBalance,
          tic_balance: currentWallet?.tic_balance || 0,
          gic_balance: currentWallet?.gic_balance || 0,
          staking_balance: currentWallet?.staking_balance || 0,
          referral_earnings_balance: currentWallet?.referral_earnings_balance || 0
        },
        update_error: updateError?.message || null
      }
    });

  } catch (error) {
    console.error('Dev wallet sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
