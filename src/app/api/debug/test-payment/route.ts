import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(request: NextRequest) {
  try {
    const { userEmail, planId } = await request.json();

    if (!userEmail || !planId) {
      return NextResponse.json(
        { error: 'userEmail and planId are required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing payment flow for:', userEmail, 'Plan:', planId);

    // Step 1: Get current balance
    console.log('📊 Step 1: Getting current balance...');
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .rpc('get_calculated_wallet_balance', { user_email_param: userEmail });

    if (balanceError) {
      console.error('❌ Balance error:', balanceError);
      return NextResponse.json({ error: 'Failed to get balance', details: balanceError }, { status: 500 });
    }

    const currentBalance = balanceData?.[0]?.total_balance || 0;
    console.log('💰 Current balance:', currentBalance);

    // Step 2: Get plan details
    console.log('📋 Step 2: Getting plan details...');
    const { data: plan, error: planError } = await supabaseAdmin
      .from('payment_plans')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('❌ Plan error:', planError);
      return NextResponse.json({ error: 'Plan not found', details: planError }, { status: 404 });
    }

    console.log('📋 Plan details:', { id: plan.plan_id, name: plan.name, price: plan.price });

    // Step 3: Check sufficient balance
    if (currentBalance < plan.price) {
      return NextResponse.json({
        error: 'Insufficient balance',
        currentBalance,
        required: plan.price,
        shortfall: plan.price - currentBalance
      }, { status: 400 });
    }

    // Step 4: Create wallet transaction
    console.log('💳 Step 4: Creating wallet transaction...');
    const transactionId = `test-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newBalance = currentBalance - plan.price;

    const { error: walletTransactionError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_email: userEmail,
        transaction_id: transactionId,
        transaction_type: 'withdrawal',
        amount: -plan.price,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Test plan purchase: ${plan.name}`,
        created_at: new Date().toISOString()
      });

    if (walletTransactionError) {
      console.error('❌ Wallet transaction error:', walletTransactionError);
      return NextResponse.json({ error: 'Failed to create wallet transaction', details: walletTransactionError }, { status: 500 });
    }

    console.log('✅ Wallet transaction created:', transactionId);

    // Step 5: Verify new balance
    console.log('🔍 Step 5: Verifying new balance...');
    const { data: newBalanceData, error: newBalanceError } = await supabaseAdmin
      .rpc('get_calculated_wallet_balance', { user_email_param: userEmail });

    if (newBalanceError) {
      console.error('❌ New balance error:', newBalanceError);
      return NextResponse.json({ error: 'Failed to verify new balance', details: newBalanceError }, { status: 500 });
    }

    const verifiedBalance = newBalanceData?.[0]?.total_balance || 0;
    console.log('💰 Verified new balance:', verifiedBalance);

    return NextResponse.json({
      success: true,
      message: 'Test payment completed successfully',
      details: {
        userEmail,
        planId,
        planName: plan.name,
        planPrice: plan.price,
        balanceBefore: currentBalance,
        balanceAfter: verifiedBalance,
        expectedBalance: newBalance,
        balanceMatches: Math.abs(verifiedBalance - newBalance) < 0.01,
        transactionId
      }
    });

  } catch (error) {
    console.error('❌ Test payment error:', error);
    return NextResponse.json(
      { error: 'Test payment failed', details: error },
      { status: 500 }
    );
  }
}
