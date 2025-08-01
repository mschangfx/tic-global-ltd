import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// TRC20 monitoring API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const supabase = createClient();

    switch (action) {
      case 'deposit_detected':
        return await handleDepositDetected(supabase, data);
      
      case 'deposit_confirmed':
        return await handleDepositConfirmed(supabase, data);
      
      case 'withdrawal_request':
        return await handleWithdrawalRequest(supabase, data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('TRC20 monitor API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleDepositDetected(supabase: any, data: any) {
  try {
    const { transaction_hash, amount, from_address, block_timestamp, user_email } = data;

    // Store the detected deposit
    const { data: deposit, error } = await supabase
      .from('deposits')
      .insert({
        user_email: user_email || 'system@ticglobal.com', // Use provided email or system default
        amount: parseFloat(amount),
        currency: 'USD',
        method_id: 'usdt-trc20',
        method_name: 'USDT',
        network: 'TRC20',
        deposit_address: 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ',
        transaction_hash,
        confirmation_count: 0,
        required_confirmations: 1,
        status: 'pending',
        final_amount: parseFloat(amount),
        admin_notes: `Auto-detected TRC20 deposit from ${from_address}`,
        created_at: block_timestamp ? new Date(block_timestamp).toISOString() : new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing deposit:', error);
      return NextResponse.json({ error: 'Failed to store deposit' }, { status: 500 });
    }

    console.log(`✅ Deposit stored: ${deposit.id} - ${amount} USDT`);

    return NextResponse.json({
      success: true,
      message: 'Deposit detected and stored',
      deposit_id: deposit.id,
      amount: parseFloat(amount),
      status: 'pending'
    });

  } catch (error) {
    console.error('Error handling deposit detection:', error);
    return NextResponse.json({ error: 'Failed to handle deposit' }, { status: 500 });
  }
}

async function handleDepositConfirmed(supabase: any, data: any) {
  try {
    const { transaction_hash, confirmations } = data;

    // Update deposit status to confirmed
    const { error } = await supabase
      .from('deposits')
      .update({
        confirmation_count: confirmations,
        status: 'completed',
        updated_at: new Date().toISOString(),
        admin_notes: 'Auto-confirmed by TRC20 automation service'
      })
      .eq('transaction_hash', transaction_hash);

    if (error) {
      console.error('Error updating deposit:', error);
      return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Deposit confirmed and credited' 
    });

  } catch (error) {
    console.error('Error handling deposit confirmation:', error);
    return NextResponse.json({ error: 'Failed to confirm deposit' }, { status: 500 });
  }
}

async function handleWithdrawalRequest(supabase: any, data: any) {
  try {
    const { withdrawal_id, user_email, amount, to_address } = data;

    // Get withdrawal request details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    // Update withdrawal status to processing
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
        admin_notes: 'Processing via TRC20 automation service'
      })
      .eq('id', withdrawal_id);

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
      return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Withdrawal request received for processing',
      withdrawal_id 
    });

  } catch (error) {
    console.error('Error handling withdrawal request:', error);
    return NextResponse.json({ error: 'Failed to handle withdrawal' }, { status: 500 });
  }
}

// GET endpoint to check service status
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'TRC20 monitoring service is active',
      timestamp: new Date().toISOString(),
      wallet_address: process.env.TRON_MAIN_WALLET_ADDRESS
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}
