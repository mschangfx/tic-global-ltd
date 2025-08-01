import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositId, status, admin_notes } = body;

    // Validate required fields
    if (!depositId || !status) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID and status are required' },
        { status: 400 }
      );
    }

    // Get the deposit record first
    const { data: deposit, error: fetchError } = await supabase
      .from('deposit')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError || !deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Update deposit status
    const { error: updateError } = await supabase
      .from('deposit')
      .update({
        status: status,
        admin_notes: admin_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', depositId);

    if (updateError) {
      console.error('Error updating deposit:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update deposit status' },
        { status: 500 }
      );
    }

    // If status is completed, update user's wallet balance
    if (status === 'completed') {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_email', deposit.user_email)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch wallet balance' },
          { status: 500 }
        );
      }

      const currentBalance = wallet?.balance || 0;
      const newBalance = currentBalance + deposit.amount;

      // Update or create wallet record
      const { error: balanceError } = await supabase
        .from('wallets')
        .upsert({
          user_email: deposit.user_email,
          balance: newBalance,
          updated_at: new Date().toISOString()
        });

      if (balanceError) {
        console.error('Error updating wallet balance:', balanceError);
        return NextResponse.json(
          { success: false, error: 'Failed to update wallet balance' },
          { status: 500 }
        );
      }

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_email: deposit.user_email,
          type: 'deposit',
          amount: deposit.amount,
          method: deposit.method,
          status: 'completed',
          transaction_id: `deposit_${depositId}`,
          created_at: new Date().toISOString()
        });

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_email: deposit.user_email,
          title: 'Deposit Completed',
          message: 'Deposit Completed',
          type: 'deposit',
          priority: 'medium',
          metadata: {
            depositId: depositId,
            amount: deposit.amount,
            method: deposit.method,
            status: 'completed'
          }
        });
    }

    return NextResponse.json({
      success: true,
      message: `Deposit ${status} successfully`,
      deposit: {
        id: depositId,
        status: status,
        amount: deposit.amount,
        method: deposit.method,
        user_email: deposit.user_email
      }
    });

  } catch (error) {
    console.error('Error in deposit completion API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
