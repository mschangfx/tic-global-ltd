import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { user_email, transaction_type, amount, currency, description, metadata, balance_before, balance_after } = await request.json();

    console.log('🔄 Creating wallet transaction for:', user_email);
    console.log('🔍 Transaction details:', { transaction_type, amount, currency, description, balance_before, balance_after });

    if (!user_email || !transaction_type || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: user_email, transaction_type, amount' },
        { status: 400 }
      );
    }

    // Get current wallet balance if balance_before/after not provided
    let beforeBalance = balance_before;
    let afterBalance = balance_after;

    if (beforeBalance === undefined || afterBalance === undefined) {
      const { data: wallet } = await supabaseAdmin
        .from('user_wallets')
        .select('total_balance')
        .eq('user_email', user_email)
        .single();

      const currentBalance = parseFloat(wallet?.total_balance || '0');

      if (beforeBalance === undefined) {
        beforeBalance = transaction_type === 'transfer_out' ? currentBalance + parseFloat(amount) : currentBalance - parseFloat(amount);
      }
      if (afterBalance === undefined) {
        afterBalance = currentBalance;
      }
    }

    // Generate a unique transaction ID
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create wallet transaction record
    const { data: transaction, error } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_email,
        transaction_id: transactionId,
        transaction_type,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        balance_before: parseFloat(beforeBalance),
        balance_after: parseFloat(afterBalance),
        description: description || `${transaction_type} transaction`,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating wallet transaction:', error);
      console.error('❌ Error details:', error.message, error.details);
      return NextResponse.json(
        { success: false, message: 'Failed to create transaction record', error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Successfully created wallet transaction:', transaction.id);

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('❌ Error in wallet transactions create API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? (error as Error).message : 'Unknown error' },
      { status: 500 }
    );
  }
}
