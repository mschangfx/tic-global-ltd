import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

// Helper to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(request: NextRequest): Promise<string | null> {
  try {
    // Method 1: Try Supabase auth (manual login) - this works reliably
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user?.email) {
        return user.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 2: Try NextAuth session (Google OAuth) - fallback
    try {
      const nextAuthSession = await getServerSession(authOptions as any);
      if ((nextAuthSession as any)?.user?.email) {
        return (nextAuthSession as any).user.email;
      }
    } catch (nextAuthError) {
      console.log('NextAuth session not available:', nextAuthError);
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionType = searchParams.get('type') || 'all'; // all, deposit, withdrawal, transfer, payment, plan, tic, gic, staking
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get authenticated user email using secure server-side authentication
    const userEmail = await getAuthenticatedUserEmail(request);
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('Fetching transaction history for:', userEmail, 'type:', transactionType);

    const allTransactions: any[] = [];

    // 1. Fetch Deposits
    if (transactionType === 'all' || transactionType === 'deposit') {
      try {
        const { data: deposits, error: depositsError } = await supabaseAdmin
          .from('deposits')
          .select('*')
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false });

        if (!depositsError && deposits) {
          const formattedDeposits = deposits.map(deposit => ({
            id: deposit.id,
            type: 'Deposit',
            amount: `+${Number(deposit.amount).toFixed(2)} ${deposit.currency || 'USD'}`,
            currency: deposit.currency || 'USD',
            status: deposit.status === 'completed' ? 'Done' : 
                   deposit.status === 'rejected' ? 'Failed' : 
                   deposit.status === 'pending' ? 'Pending' : deposit.status,
            date: new Date(deposit.created_at).toISOString().split('T')[0],
            time: new Date(deposit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: deposit.id,
            fromSystem: 'External Wallet',
            toSystem: 'My Wallet',
            details: {
              network: deposit.network,
              wallet_address: deposit.wallet_address,
              admin_notes: deposit.admin_notes
            },
            created_at: deposit.created_at
          }));
          allTransactions.push(...formattedDeposits);
        }
      } catch (error) {
        console.error('Error fetching deposits:', error);
      }
    }

    // 2. Fetch Withdrawals
    if (transactionType === 'all' || transactionType === 'withdrawal') {
      try {
        // Get all withdrawals without the problematic payment_methods join
        const { data: withdrawals, error: withdrawalsError } = await supabaseAdmin
          .from('withdrawal_requests')
          .select('*')
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false });

        if (!withdrawalsError && withdrawals) {
          console.log(`Found ${withdrawals.length} withdrawals for user ${userEmail}`);

          const formattedWithdrawals = withdrawals.map(withdrawal => ({
            id: withdrawal.id,
            type: 'Withdrawal',
            amount: `-${Number(withdrawal.amount).toFixed(2)} ${withdrawal.currency || 'USD'}`,
            currency: withdrawal.currency || 'USD',
            status: withdrawal.status === 'completed' ? 'Done' :
                   withdrawal.status === 'failed' ? 'Failed' :
                   withdrawal.status === 'pending' ? 'Pending' : withdrawal.status,
            date: new Date(withdrawal.created_at).toISOString().split('T')[0],
            time: new Date(withdrawal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: withdrawal.id,
            fromSystem: 'My Wallet',
            toSystem: withdrawal.method_id === 'gcash' ? 'GCash' :
                     withdrawal.method_id === 'paymaya' ? 'PayMaya' :
                     'External Address',
            details: {
              destination_address: withdrawal.destination_address,
              payment_method: withdrawal.method_id === 'gcash' ? 'GCash' :
                             withdrawal.method_id === 'paymaya' ? 'PayMaya' :
                             withdrawal.method_id,
              network: withdrawal.network || 'Digital Wallet',
              admin_notes: withdrawal.admin_notes,
              blockchain_hash: withdrawal.blockchain_hash,
              processing_fee: withdrawal.processing_fee,
              final_amount: withdrawal.final_amount
            },
            created_at: withdrawal.created_at
          }));
          allTransactions.push(...formattedWithdrawals);
        } else if (withdrawalsError) {
          console.error('Error fetching withdrawals:', withdrawalsError);
        }
      } catch (error) {
        console.error('Error fetching withdrawals:', error);
      }
    }

    // 3. Fetch Transfers
    if (transactionType === 'all' || transactionType === 'transfer') {
      try {
        const { data: transfers, error: transfersError } = await supabaseAdmin
          .from('user_transfers')
          .select('*')
          .or(`sender_email.eq.${userEmail},recipient_email.eq.${userEmail}`)
          .order('created_at', { ascending: false });

        if (!transfersError && transfers) {
          const formattedTransfers = transfers.map(transfer => {
            const isSender = transfer.sender_email === userEmail;
            return {
              id: transfer.id,
              type: isSender ? 'Transfer Out' : 'Transfer In',
              amount: isSender ? 
                `-${Number(transfer.total_deducted).toFixed(2)} USD` : 
                `+${Number(transfer.transfer_amount).toFixed(2)} USD`,
              currency: 'USD',
              status: 'Done',
              date: new Date(transfer.created_at).toISOString().split('T')[0],
              time: new Date(transfer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
              invoiceId: transfer.id,
              fromSystem: isSender ? 'My Wallet' : transfer.sender_email,
              toSystem: isSender ? transfer.recipient_email : 'My Wallet',
              details: {
                transfer_amount: transfer.transfer_amount,
                fee_amount: transfer.fee_amount,
                note: transfer.note,
                other_party: isSender ? transfer.recipient_email : transfer.sender_email
              },
              created_at: transfer.created_at
            };
          });
          allTransactions.push(...formattedTransfers);
        }
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }
    }

    // 4. Fetch Between-Accounts Transfers from wallet_transactions
    if (transactionType === 'all' || transactionType === 'transfer') {
      try {
        // Fetch between-accounts transfers from wallet_transactions table
        const { data: betweenAccountsTransfers, error: betweenAccountsError } = await supabaseAdmin
          .from('wallet_transactions')
          .select('*')
          .eq('user_email', userEmail)
          .eq('transaction_type', 'transfer_between_accounts')
          .order('created_at', { ascending: false });

        if (!betweenAccountsError && betweenAccountsTransfers) {
          console.log(`Found ${betweenAccountsTransfers.length} between-accounts transfers for user ${userEmail}`);

          const formattedBetweenAccountsTransfers = betweenAccountsTransfers.map(tx => ({
            id: tx.id,
            type: 'Account Transfer',
            amount: `${Number(tx.amount).toFixed(2)} ${tx.currency || 'USD'}`,
            currency: tx.currency || 'USD',
            status: 'Done',
            date: new Date(tx.created_at).toISOString().split('T')[0],
            time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: tx.transaction_id || tx.id,
            fromSystem: tx.metadata?.from_account === 'total' ? 'Main Wallet' :
                       tx.metadata?.from_account === 'tic' ? 'TIC Wallet' :
                       tx.metadata?.from_account === 'gic' ? 'GIC Wallet' :
                       tx.metadata?.from_account === 'staking' ? 'Staking Wallet' :
                       tx.metadata?.from_account === 'partner_wallet' ? 'Partner Wallet' :
                       tx.metadata?.from_account || 'Unknown',
            toSystem: tx.metadata?.to_account === 'total' ? 'Main Wallet' :
                     tx.metadata?.to_account === 'tic' ? 'TIC Wallet' :
                     tx.metadata?.to_account === 'gic' ? 'GIC Wallet' :
                     tx.metadata?.to_account === 'staking' ? 'Staking Wallet' :
                     tx.metadata?.to_account === 'partner_wallet' ? 'Partner Wallet' :
                     tx.metadata?.to_account || 'Unknown',
            details: {
              description: tx.description,
              from_account: tx.metadata?.from_account,
              to_account: tx.metadata?.to_account,
              from_balance_before: tx.metadata?.from_balance_before,
              from_balance_after: tx.metadata?.from_balance_after,
              to_balance_before: tx.metadata?.to_balance_before,
              to_balance_after: tx.metadata?.to_balance_after
            },
            created_at: tx.created_at
          }));
          allTransactions.push(...formattedBetweenAccountsTransfers);
        } else if (betweenAccountsError) {
          console.error('Error fetching between-accounts transfers:', betweenAccountsError);
        }
      } catch (error) {
        console.error('Error fetching between-accounts transfers:', error);
      }
    }

    // 5. Fetch Plan Purchase Payments (from payment_transactions table)
    if (transactionType === 'all' || transactionType === 'payment' || transactionType === 'plan') {
      try {
        const { data: paymentTransactions, error: paymentError } = await supabaseAdmin
          .from('payment_transactions')
          .select('*')
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false });

        if (!paymentError && paymentTransactions) {
          console.log(`Found ${paymentTransactions.length} payment transactions for user ${userEmail}`);

          const formattedPayments = paymentTransactions.map(payment => ({
            id: payment.id,
            type: `Plan Purchase - ${payment.plan_name}`,
            amount: `-${Number(payment.amount).toFixed(2)} ${payment.currency || 'USD'}`,
            currency: payment.currency || 'USD',
            status: payment.status === 'completed' ? 'Done' :
                   payment.status === 'failed' ? 'Failed' :
                   payment.status === 'pending' ? 'Pending' : payment.status,
            date: new Date(payment.created_at).toISOString().split('T')[0],
            time: new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: payment.id,
            fromSystem: 'My Wallet',
            toSystem: `${payment.plan_name} Subscription`,
            details: {
              plan_id: payment.plan_id,
              plan_name: payment.plan_name,
              payment_method: payment.payment_method,
              wallet_balance_before: payment.wallet_balance_before,
              wallet_balance_after: payment.wallet_balance_after,
              wallet_transaction_id: payment.wallet_transaction_id,
              // Add additional context for single transaction display
              transaction_summary: `Purchased ${payment.plan_name} for $${Number(payment.amount).toFixed(2)} from wallet balance`,
              balance_change: `Balance: $${Number(payment.wallet_balance_before || 0).toFixed(2)} → $${Number(payment.wallet_balance_after || 0).toFixed(2)}`
            },
            created_at: payment.created_at
          }));
          allTransactions.push(...formattedPayments);
        }
      } catch (error) {
        console.error('Error fetching payment transactions:', error);
      }
    }

    // 6. Fetch Wallet Transactions for Plan Purchases (ONLY if no payment_transactions exist)
    // This prevents duplicate transactions - we prioritize payment_transactions for plan purchases
    if (transactionType === 'all' || transactionType === 'payment' || transactionType === 'plan') {
      try {
        // Only fetch wallet payment transactions that don't have corresponding payment_transactions
        const { data: walletPayments, error: walletPaymentError } = await supabaseAdmin
          .from('wallet_transactions')
          .select('*')
          .eq('user_email', userEmail)
          .eq('transaction_type', 'payment')
          .order('created_at', { ascending: false });

        if (!walletPaymentError && walletPayments) {
          console.log(`Found ${walletPayments.length} wallet payment transactions for user ${userEmail}`);

          // Get all payment transaction IDs to avoid duplicates
          const existingPaymentTransactions = allTransactions
            .filter(tx => tx.type.includes('Plan Purchase'))
            .map(tx => tx.details?.wallet_transaction_id);

          // Only include wallet transactions that don't have a corresponding payment transaction
          const uniqueWalletPayments = walletPayments.filter(tx =>
            !existingPaymentTransactions.includes(tx.transaction_id)
          );

          console.log(`Filtered to ${uniqueWalletPayments.length} unique wallet payment transactions (avoiding duplicates)`);

          const formattedWalletPayments = uniqueWalletPayments.map(tx => ({
            id: `wallet_${tx.id}`,
            type: `Plan Purchase - ${tx.description.replace('Plan purchase: ', '')}`,
            amount: `${Number(tx.amount).toFixed(2)} USD`,
            currency: tx.currency || 'USD',
            status: 'Done',
            date: new Date(tx.created_at).toISOString().split('T')[0],
            time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: tx.transaction_id,
            fromSystem: 'My Wallet',
            toSystem: 'Plan Subscription',
            details: {
              description: tx.description,
              transaction_type: tx.transaction_type,
              balance_before: tx.balance_before,
              balance_after: tx.balance_after,
              transaction_id: tx.transaction_id
            },
            created_at: tx.created_at
          }));
          allTransactions.push(...formattedWalletPayments);
        }
      } catch (error) {
        console.error('Error fetching wallet payment transactions:', error);
      }
    }

    // 7. Fetch TIC Token Transactions (from plan purchases, daily distributions, etc.)
    if (transactionType === 'all' || transactionType === 'tic') {
      try {
        // Fetch TIC transactions from wallet_transactions table
        const { data: walletTransactions, error: walletError } = await supabaseAdmin
          .from('wallet_transactions')
          .select('*')
          .eq('user_email', userEmail)
          .or('transaction_type.eq.tic_distribution,transaction_type.eq.tic_bonus,transaction_type.eq.bonus,currency.eq.TIC')
          .order('created_at', { ascending: false });

        if (!walletError && walletTransactions) {
          const formattedTicTx = walletTransactions.map(tx => {
            const isRankBonus = tx.transaction_type === 'bonus' && tx.metadata?.bonus_type === 'rank_bonus';
            const isDailyDistribution = tx.transaction_type === 'bonus' && tx.metadata?.bonus_type === 'daily_distribution';
            const isVipDistribution = isDailyDistribution && tx.metadata?.plan_type === 'vip';
            const isStarterDistribution = isDailyDistribution && tx.metadata?.plan_type === 'starter';

            // Determine transaction type label
            let transactionType = 'TIC Transaction';
            let fromSystem = 'System';

            if (isRankBonus) {
              transactionType = 'TIC Rank Bonus';
              fromSystem = 'Rank Bonus System';
            } else if (isVipDistribution) {
              transactionType = 'TIC Token VIP Plan';
              fromSystem = 'VIP Plan';
            } else if (isStarterDistribution) {
              transactionType = 'TIC Token Starter Plan';
              fromSystem = 'Starter Plan';
            } else if (isDailyDistribution) {
              transactionType = 'TIC Plan Distribution';
              fromSystem = 'Plan Distribution';
            }

            return {
              id: tx.id,
              type: transactionType,
              amount: `${tx.amount >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)} TIC`,
              currency: 'TIC',
              status: 'Done',
              date: new Date(tx.created_at).toISOString().split('T')[0],
              time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
              invoiceId: tx.id,
              fromSystem: fromSystem,
              toSystem: 'My TIC Wallet',
              details: {
                description: tx.description,
                transaction_type: tx.transaction_type,
                bonus_type: tx.metadata?.bonus_type,
                plan_type: tx.metadata?.plan_type
              },
              created_at: tx.created_at
            };
          });
          allTransactions.push(...formattedTicTx);
        }

        // Fetch TIC from plan purchases
        const { data: planPurchases, error: planError } = await supabaseAdmin
          .from('user_plans')
          .select('*')
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false });

        if (!planError && planPurchases) {
          const formattedPlanTx = planPurchases.map(plan => ({
            id: plan.id,
            type: 'TIC Plan Purchase',
            amount: `+${Number(plan.tic_tokens || 0).toFixed(2)} TIC`,
            currency: 'TIC',
            status: plan.status === 'active' ? 'Done' : 'Pending',
            date: new Date(plan.created_at).toISOString().split('T')[0],
            time: new Date(plan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: plan.id,
            fromSystem: 'Plan Purchase',
            toSystem: 'My TIC Wallet',
            details: {
              plan_type: plan.plan_type,
              tic_tokens: plan.tic_tokens,
              duration_months: plan.duration_months
            },
            created_at: plan.created_at
          }));
          allTransactions.push(...formattedPlanTx);
        }
      } catch (error) {
        console.error('Error fetching TIC transactions:', error);
      }
    }

    // 6. Fetch GIC Token Transactions (from trading activities)
    if (transactionType === 'all' || transactionType === 'gic') {
      try {
        // Fetch GIC transactions from wallet_transactions table
        const { data: gicTransactions, error: gicError } = await supabaseAdmin
          .from('wallet_transactions')
          .select('*')
          .eq('user_email', userEmail)
          .or('transaction_type.eq.gic_trade,transaction_type.eq.gic_bonus,currency.eq.GIC')
          .order('created_at', { ascending: false });

        if (!gicError && gicTransactions) {
          const formattedGicTx = gicTransactions.map(tx => ({
            id: tx.id,
            type: tx.transaction_type === 'gic_trade' ? 'GIC Trading' : 'GIC Transaction',
            amount: `${tx.amount >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)} GIC`,
            currency: 'GIC',
            status: 'Done',
            date: new Date(tx.created_at).toISOString().split('T')[0],
            time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: tx.id,
            fromSystem: tx.transaction_type === 'gic_trade' ? 'Trading System' : 'System',
            toSystem: 'My GIC Wallet',
            details: {
              description: tx.description,
              transaction_type: tx.transaction_type,
              trade_type: tx.metadata?.trade_type
            },
            created_at: tx.created_at
          }));
          allTransactions.push(...formattedGicTx);
        }

        // Fetch GIC trading history from trader_transactions table if it exists
        try {
          const { data: traderTrades, error: tradeError } = await supabaseAdmin
            .from('trader_transactions')
            .select('*')
            .eq('user_email', userEmail)
            .order('created_at', { ascending: false });

          if (!tradeError && traderTrades) {
            const formattedTrades = traderTrades.map(trade => ({
              id: trade.id,
              type: `GIC ${trade.trade_type === 'buy' ? 'Purchase' : 'Sale'}`,
              amount: trade.trade_type === 'buy' ?
                `+${Number(trade.gic_amount).toFixed(2)} GIC` :
                `-${Number(trade.gic_amount).toFixed(2)} GIC`,
              currency: 'GIC',
              status: trade.status === 'completed' ? 'Done' : 'Pending',
              date: new Date(trade.created_at).toISOString().split('T')[0],
              time: new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
              invoiceId: trade.id,
              fromSystem: trade.trade_type === 'buy' ? 'USD Wallet' : 'GIC Wallet',
              toSystem: trade.trade_type === 'buy' ? 'GIC Wallet' : 'USD Wallet',
              details: {
                trade_type: trade.trade_type,
                gic_amount: trade.gic_amount,
                usd_amount: trade.usd_amount,
                price_per_gic: trade.price_per_gic
              },
              created_at: trade.created_at
            }));
            allTransactions.push(...formattedTrades);
          }
        } catch (tradeError) {
          // trader_transactions table might not exist yet
          console.log('trader_transactions table not found, skipping...');
        }
      } catch (error) {
        console.error('Error fetching GIC transactions:', error);
      }
    }

    // 7. Fetch Staking Transactions
    if (transactionType === 'all' || transactionType === 'staking') {
      try {
        // Fetch staking transactions from wallet_transactions table
        const { data: stakingTransactions, error: stakingError } = await supabaseAdmin
          .from('wallet_transactions')
          .select('*')
          .eq('user_email', userEmail)
          .or('transaction_type.eq.staking_deposit,transaction_type.eq.staking_reward,transaction_type.eq.staking_withdrawal')
          .order('created_at', { ascending: false });

        if (!stakingError && stakingTransactions) {
          const formattedStakingTx = stakingTransactions.map(tx => ({
            id: tx.id,
            type: tx.transaction_type === 'staking_deposit' ? 'Staking Deposit' :
                  tx.transaction_type === 'staking_reward' ? 'Staking Reward' :
                  tx.transaction_type === 'staking_withdrawal' ? 'Staking Withdrawal' :
                  'Staking Transaction',
            amount: `${tx.amount >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)} ${tx.currency || 'USD'}`,
            currency: tx.currency || 'USD',
            status: 'Done',
            date: new Date(tx.created_at).toISOString().split('T')[0],
            time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: tx.id,
            fromSystem: tx.transaction_type === 'staking_deposit' ? 'My Wallet' : 'Staking Pool',
            toSystem: tx.transaction_type === 'staking_deposit' ? 'Staking Pool' : 'My Wallet',
            details: {
              description: tx.description,
              transaction_type: tx.transaction_type,
              staking_period: tx.metadata?.staking_period
            },
            created_at: tx.created_at
          }));
          allTransactions.push(...formattedStakingTx);
        }
      } catch (error) {
        console.error('Error fetching staking transactions:', error);
      }
    }

    // 7. Fetch Trader Activation Transactions
    if (transactionType === 'all' || transactionType === 'trader') {
      try {
        const { data: traderTx, error: traderError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_email', userEmail)
          .eq('transaction_type', 'trader_activation')
          .order('created_at', { ascending: false });

        if (!traderError && traderTx) {
          const formattedTraderTx = traderTx.map(tx => ({
            id: tx.id,
            type: 'Trader Activation',
            amount: `-${Number(tx.amount).toFixed(2)} ${tx.currency || 'USD'}`,
            currency: tx.currency || 'USD',
            status: 'Done',
            date: new Date(tx.created_at).toISOString().split('T')[0],
            time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            invoiceId: tx.id,
            fromSystem: 'My Wallet',
            toSystem: 'Trader Package',
            details: {
              packages_activated: tx.request_metadata?.packages_activated,
              package_type: tx.request_metadata?.package_type
            },
            created_at: tx.created_at
          }));
          allTransactions.push(...formattedTraderTx);
        }
      } catch (error) {
        console.error('Error fetching trader transactions:', error);
      }
    }

    // Sort all transactions by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply status filter
    let filteredTransactions = allTransactions;
    if (status !== 'all') {
      filteredTransactions = allTransactions.filter(tx => tx.status.toLowerCase() === status.toLowerCase());
    }

    // Apply pagination
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
      total: filteredTransactions.length,
      hasMore: offset + limit < filteredTransactions.length,
      summary: {
        total: allTransactions.length,
        deposits: allTransactions.filter(tx => tx.type === 'Deposit').length,
        withdrawals: allTransactions.filter(tx => tx.type === 'Withdrawal').length,
        transfers: allTransactions.filter(tx => tx.type.includes('Transfer')).length,
        other: allTransactions.filter(tx => !['Deposit', 'Withdrawal'].includes(tx.type) && !tx.type.includes('Transfer')).length
      }
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch transaction history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
