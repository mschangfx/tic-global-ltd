import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// TRC20 withdrawal API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_email, amount, to_address, user_id } = body;

    // Validate required fields
    if (!user_email || !amount || !to_address) {
      return NextResponse.json(
        { error: 'Missing required fields: user_email, amount, to_address' },
        { status: 400 }
      );
    }

    // Validate TRON address format
    if (!isValidTronAddress(to_address)) {
      return NextResponse.json(
        { error: 'Invalid TRON address format' },
        { status: 400 }
      );
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    const minWithdrawal = 10;
    const maxWithdrawal = 1000000;
    
    if (withdrawalAmount < minWithdrawal || withdrawalAmount > maxWithdrawal) {
      return NextResponse.json(
        { error: `Withdrawal amount must be between ${minWithdrawal} and ${maxWithdrawal} USDT` },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check user's wallet balance using calculated balance (same as frontend)
    const { data: calculatedBalance, error: balanceError } = await supabase
      .rpc('get_calculated_wallet_balance', {
        user_email_param: user_email
      });

    if (balanceError || !calculatedBalance || calculatedBalance.length === 0) {
      console.error('❌ Error getting calculated balance for TRC20 withdrawal:', balanceError);
      return NextResponse.json(
        { error: 'Unable to fetch wallet balance' },
        { status: 500 }
      );
    }

    const balance = calculatedBalance[0];
    const currentBalance = parseFloat(balance.total_balance?.toString() || '0');
    const processingFee = withdrawalAmount * 0.1; // 10% processing fee
    const totalRequired = withdrawalAmount + processingFee;

    console.log('💰 TRC20 withdrawal balance check:', {
      userEmail: user_email,
      requestedAmount: withdrawalAmount,
      processingFee,
      totalRequired,
      availableBalance: currentBalance,
      sufficient: currentBalance >= totalRequired
    });

    if (currentBalance < totalRequired) {
      return NextResponse.json(
        { error: `Insufficient balance. Required: ${totalRequired} USDT (including 10% fee), Available: ${currentBalance} USDT` },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_email,
        transaction_id: crypto.randomUUID(),
        method_id: 'usdt-trc20',
        destination_address: to_address,
        amount: withdrawalAmount,
        currency: 'USD',
        network: 'TRC20',
        processing_fee: processingFee,
        network_fee: 0,
        final_amount: withdrawalAmount,
        status: 'pending',
        admin_notes: 'TRC20 USDT withdrawal request',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal request:', withdrawalError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
        { status: 500 }
      );
    }

    // Debit user's wallet (hold the funds)
    const { error: debitError } = await supabase.rpc('debit_user_wallet', {
      user_email_param: user_email,
      amount_param: totalRequired,
      transaction_id_param: withdrawal.id,
      description_param: `TRC20 USDT withdrawal to ${to_address}`
    });

    if (debitError) {
      console.error('Error debiting wallet:', debitError);
      
      // Rollback withdrawal request
      await supabase
        .from('withdrawal_requests')
        .delete()
        .eq('id', withdrawal.id);

      return NextResponse.json(
        { error: 'Failed to process withdrawal - insufficient funds' },
        { status: 400 }
      );
    }

    // Notify TRC20 automation service (if running)
    try {
      await notifyTRC20Service({
        action: 'withdrawal_request',
        data: {
          withdrawal_id: withdrawal.id,
          user_email,
          amount: withdrawalAmount,
          to_address,
          processing_fee: processingFee
        }
      });
    } catch (notifyError) {
      console.warn('Failed to notify TRC20 service:', notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawalAmount,
        processing_fee: processingFee,
        total_deducted: totalRequired,
        to_address,
        status: 'pending',
        estimated_processing_time: '1-3 minutes'
      }
    });

  } catch (error) {
    console.error('TRC20 withdrawal API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidTronAddress(address: string): boolean {
  // TRON address validation
  const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
  return tronAddressRegex.test(address);
}

async function notifyTRC20Service(payload: any) {
  // This would call your TRC20 automation service
  // For now, just log the notification
  console.log('TRC20 Service Notification:', payload);
  
  // In production, you might:
  // 1. Call a webhook
  // 2. Add to a message queue
  // 3. Write to a shared database table
  // 4. Send via WebSocket
}

// GET endpoint to check withdrawal status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withdrawalId = searchParams.get('id');
    const userEmail = searchParams.get('user_email');

    if (!withdrawalId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing withdrawal ID or user email' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: withdrawal, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .eq('user_email', userEmail)
      .single();

    if (error || !withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        to_address: withdrawal.destination_address,
        status: withdrawal.status,
        processing_fee: withdrawal.processing_fee,
        blockchain_hash: withdrawal.blockchain_hash,
        created_at: withdrawal.created_at,
        processed_at: withdrawal.processed_at
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
