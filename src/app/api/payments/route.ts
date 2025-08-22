import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import NotificationService from '@/lib/services/notificationService';

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

// GET - Get available payment plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    const supabase = supabaseAdmin;

    if (planId) {
      // Get specific plan
      const { data: plan, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_active', true)
        .single();

      if (error || !plan) {
        return NextResponse.json(
          { error: 'Payment plan not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        plan: plan
      });
    } else {
      // Get all active plans
      const { data: plans, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching payment plans:', error);
        return NextResponse.json(
          { error: 'Failed to fetch payment plans' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        plans: plans || [],
        count: plans?.length || 0
      });
    }

  } catch (error) {
    console.error('Error in payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Process plan payment
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    console.log('🔍 Payment API: Checking authentication...');
    const session = await getServerSession(authOptions);
    console.log('🔍 Payment API: Session data:', session ? 'Session exists' : 'No session');
    console.log('🔍 Payment API: User email:', session?.user?.email || 'No email');

    if (!session?.user?.email) {
      console.log('❌ Payment API: User not authenticated - no session or email');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Use authenticated user's email instead of accepting it from request body
    const userEmail = session.user.email;

    const supabase = supabaseAdmin;

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Payment plan not found or inactive' },
        { status: 404 }
      );
    }

    // Get user's calculated wallet balance using the same function as balance API
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_calculated_wallet_balance', { user_email_param: userEmail });

    if (balanceError) {
      console.error('Error getting wallet balance:', balanceError);
      return NextResponse.json(
        { error: 'Failed to get wallet balance' },
        { status: 500 }
      );
    }

    const currentBalance = parseFloat(balanceData?.[0]?.total_balance?.toString() || '0');

    console.log('🔍 Payment processing for user:', userEmail);
    console.log('💰 Current balance:', currentBalance);
    console.log('💳 Plan price:', plan.price);

    // Check sufficient balance
    if (currentBalance < plan.price) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          required: plan.price,
          available: currentBalance,
          shortfall: plan.price - currentBalance
        },
        { status: 400 }
      );
    }

    // Use the debit_user_wallet function to properly deduct from wallet
    const transactionId = `plan-purchase-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    console.log(`💰 Debiting $${plan.price} from wallet using debit_user_wallet function`);

    const { error: debitError } = await supabase
      .rpc('debit_user_wallet', {
        user_email_param: userEmail,
        amount_param: plan.price,
        transaction_id_param: transactionId,
        transaction_type_param: 'payment',
        description_param: `Plan purchase: ${plan.name}`
      });

    if (debitError) {
      console.error('❌ Error debiting wallet:', debitError);
      return NextResponse.json(
        { error: 'Failed to deduct from wallet balance', details: debitError.message },
        { status: 500 }
      );
    }

    console.log('✅ Wallet debited successfully using transaction-based system');

    // Get the updated balance for payment transaction record
    const { data: updatedBalanceData } = await supabase
      .rpc('get_calculated_wallet_balance', { user_email_param: userEmail });

    const newBalance = parseFloat(updatedBalanceData?.[0]?.total_balance?.toString() || '0');

    // Create payment transaction record
    const { data: paymentTransaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_email: userEmail,
        plan_id: planId,
        plan_name: plan.name,
        amount: plan.price,
        currency: 'USD',
        payment_method: 'wallet_balance',
        status: 'completed',
        wallet_balance_before: currentBalance,
        wallet_balance_after: newBalance,
        wallet_transaction_id: transactionId, // Reference to the wallet transaction
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating payment transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to record payment transaction' },
        { status: 500 }
      );
    }

    const paymentTransactionId = paymentTransaction.id;

    // Create user subscription record
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date(subscriptionStartDate);
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // Add exactly 1 year

    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_email: userEmail,
        plan_id: planId,
        plan_name: plan.name,
        status: 'active',
        start_date: subscriptionStartDate.toISOString(),
        end_date: subscriptionEndDate.toISOString(),
        payment_transaction_id: paymentTransactionId,
        auto_renew: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      // Don't fail the payment if subscription creation fails, but log it
    }

    // Immediately distribute first day's TIC tokens after plan purchase
    if (subscription && !subscriptionError) {
      try {
        await distributeInitialTicTokens(userEmail, planId, plan.name, subscription.id);
      } catch (distributionError) {
        console.error('Error distributing initial TIC tokens:', distributionError);
        // Don't fail the payment if token distribution fails, but log it
      }
    }

    // Create notification for successful payment
    try {
      await NotificationService.createTransactionNotification(
        userEmail,
        'payment',
        plan.price,
        plan.currency,
        paymentTransactionId
      );
    } catch (notificationError) {
      console.error('Error creating payment notification:', notificationError);
      // Don't fail the payment if notification fails
    }

    // Note: Partner commissions are NOT triggered by plan purchases
    // Partner commissions come from daily unilevel commissions:
    // - $0.44 per VIP account per day
    // - Distributed via /api/cron/daily-unilevel-commissions
    // - Based on referral network structure, not plan purchases

    // Get updated wallet balance to confirm the deduction
    const { data: updatedWallet, error: balanceCheckError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (balanceCheckError) {
      console.error('❌ Error fetching updated wallet balance:', balanceCheckError);
    } else {
      console.log(`✅ Wallet balance after payment: $${updatedWallet.total_balance} (was $${currentBalance})`);
    }

    // Trigger wallet sync to ensure accurate balance calculation across all systems
    try {
      const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/api/dev/sync-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });

      if (syncResponse.ok) {
        console.log('✅ Wallet synced after payment');
      }
    } catch (syncError) {
      console.error('Error syncing wallet after payment:', syncError);
    }

    // Calculate referral commissions for VIP plans
    let commissionResult = null;
    if (plan.plan_id === 'vip') {
      try {
        const commissionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/api/referral/calculate-commissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: userEmail,
            planType: 'vip',
            planValue: plan.price,
            planCount: 1
          })
        });

        if (commissionResponse.ok) {
          commissionResult = await commissionResponse.json();
          console.log('✅ Referral commissions calculated:', commissionResult);
        }
      } catch (commissionError) {
        console.error('Error calculating referral commissions:', commissionError);
        // Don't fail the payment if commission calculation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment successful! ${plan.name} activated.`,
      transaction: {
        id: paymentTransactionId,
        amount: plan.price,
        currency: plan.currency,
        status: 'completed',
        created_at: paymentTransaction.created_at,
        completed_at: paymentTransaction.completed_at
      },
      plan: {
        id: plan.plan_id,
        name: plan.name,
        price: plan.price,
        duration_days: plan.duration_days
      },
      subscription: subscription ? {
        id: subscription.id,
        plan_name: subscription.plan_name,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date
      } : null,
      wallet: {
        previous_balance: currentBalance,
        current_balance: newBalance,
        amount_deducted: plan.price,
        updated_balance: updatedWallet?.total_balance || newBalance
      },
      referralCommissions: commissionResult?.success ? {
        commissionsCreated: commissionResult.commissionsCreated?.length || 0,
        totalCommissions: commissionResult.totalCommissions || 0,
        details: commissionResult.commissionsCreated || []
      } : null
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update payment plan (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, updates, adminKey } = body;

    // Simple admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!planId || !updates) {
      return NextResponse.json(
        { error: 'Plan ID and updates are required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('payment_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('plan_id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment plan:', error);
      return NextResponse.json(
        { error: 'Failed to update payment plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment plan updated successfully',
      plan: data
    });

  } catch (error) {
    console.error('Error updating payment plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate payment plan (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const adminKey = searchParams.get('adminKey');

    // Simple admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    const { error } = await supabase
      .from('payment_plans')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('plan_id', planId);

    if (error) {
      console.error('Error deactivating payment plan:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate payment plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment plan deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating payment plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
