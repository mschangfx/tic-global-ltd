import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = user.email;
    console.log('🔄 Syncing wallet for:', userEmail);

    // Get admin client for database operations
    const admin = supabaseAdmin;

    // Calculate total deposits
    const { data: deposits, error: depositError } = await admin
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
    const { data: withdrawals, error: withdrawalError } = await admin
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
    const { data: transactions, error: transactionError } = await admin
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
    const { data: paymentTransactions, error: paymentError } = await admin
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
      balance: calculatedBalance
    });

    // Get current wallet to preserve token balances
    const { data: currentWallet } = await admin
      .from('user_wallets')
      .select('tic_balance, gic_balance, staking_balance, referral_earnings_balance')
      .eq('user_email', userEmail)
      .single();

    // Update only the total_balance and last_updated, leave token balances untouched
    const { data: updatedWallet, error: updateError } = await admin
      .from('user_wallets')
      .update({
        total_balance: calculatedBalance,
        last_updated: new Date().toISOString()
      })
      .eq('user_email', userEmail)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return NextResponse.json(
        { error: 'Failed to update wallet' },
        { status: 500 }
      );
    }

    console.log('✅ Wallet synced successfully:', updatedWallet);

    return NextResponse.json({
      success: true,
      message: 'Wallet synced successfully',
      wallet: {
        total_balance: calculatedBalance,
        tic_balance: 0,
        gic_balance: 0,
        staking_balance: 0,
        last_updated: updatedWallet.last_updated
      },
      calculation: {
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        transaction_deposits: transactionDeposits,
        transaction_withdrawals: transactionWithdrawals,
        calculated_balance: calculatedBalance
      }
    });

  } catch (error) {
    console.error('Wallet sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
