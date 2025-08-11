import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import NotificationService from '@/lib/services/notificationService';

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    // Get user wallet to check balance
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 404 }
      );
    }

    // Check sufficient balance
    if (wallet.total_balance < plan.price) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          required: plan.price,
          available: wallet.total_balance,
          shortfall: plan.price - wallet.total_balance
        },
        { status: 400 }
      );
    }

    // Manual payment processing (without database function for now)

    // Get current wallet balance using the transaction-based system
    console.log('🔍 Fetching wallet balance for user:', userEmail);
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_calculated_wallet_balance', { user_email_param: userEmail });

    if (balanceError || !balanceData || balanceData.length === 0) {
      console.error('❌ Error fetching wallet balance:', balanceError);
      return NextResponse.json(
        { error: 'Unable to fetch wallet balance' },
        { status: 500 }
      );
    }

    const currentBalance = parseFloat(balanceData[0].total_balance) || 0;
    console.log('💰 Current wallet balance:', currentBalance, 'Plan price:', plan.price);

    // Check sufficient balance
    if (currentBalance < plan.price) {
      return NextResponse.json(
        { error: `Insufficient balance. Required: $${plan.price}, Available: $${currentBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - plan.price;

    // Create a withdrawal transaction for the plan purchase
    const transactionId = `plan-purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('💳 Creating wallet transaction:', transactionId, 'Amount:', -plan.price);

    const { error: walletTransactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_email: userEmail,
        transaction_id: transactionId,
        transaction_type: 'withdrawal',
        amount: -plan.price, // Negative amount for withdrawal/deduction
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Plan purchase: ${plan.name}`,
        created_at: new Date().toISOString()
      });

    if (walletTransactionError) {
      console.error('❌ Error creating wallet transaction:', walletTransactionError);
      return NextResponse.json(
        { error: 'Failed to deduct from wallet balance' },
        { status: 500 }
      );
    }

    console.log('✅ Wallet transaction created successfully');

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

    // Trigger wallet sync to ensure accurate balance calculation
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

    // Get updated wallet balance
    const { data: updatedWallet } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

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
