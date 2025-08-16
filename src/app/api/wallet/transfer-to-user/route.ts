import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { 
      senderEmail, 
      recipientEmail, 
      recipientWalletAddress, 
      transferAmount, 
      fee, 
      note 
    } = await request.json();

    // Validate required fields
    if (!senderEmail || !recipientEmail || !recipientWalletAddress || !transferAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (transferAmount <= 0 || fee < 0) {
      return NextResponse.json(
        { error: 'Invalid transfer amount or fee' },
        { status: 400 }
      );
    }

    if (senderEmail === recipientEmail) {
      return NextResponse.json(
        { error: 'Cannot transfer to yourself' },
        { status: 400 }
      );
    }

    console.log('🔄 Transfer to user request:', {
      senderEmail,
      recipientEmail,
      recipientWalletAddress,
      transferAmount,
      fee
    });

    // Get sender's current wallet balance
    const { data: senderWallet, error: senderError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', senderEmail)
      .single();

    if (senderError || !senderWallet) {
      console.error('Error fetching sender wallet:', senderError);
      return NextResponse.json(
        { error: 'Sender wallet not found' },
        { status: 404 }
      );
    }

    // Get recipient's current wallet balance
    const { data: recipientWallet, error: recipientError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', recipientEmail)
      .single();

    if (recipientError || !recipientWallet) {
      console.error('Error fetching recipient wallet:', recipientError);
      return NextResponse.json(
        { error: 'Recipient wallet not found' },
        { status: 404 }
      );
    }

    // Verify recipient wallet address matches
    const { data: recipientAddress, error: addressError } = await supabaseAdmin
      .from('user_wallet_addresses')
      .select('wallet_address')
      .eq('user_email', recipientEmail)
      .single();

    if (addressError || !recipientAddress || recipientAddress.wallet_address !== recipientWalletAddress) {
      return NextResponse.json(
        { error: 'Invalid recipient wallet address' },
        { status: 400 }
      );
    }

    const totalDeducted = transferAmount + fee;

    // Check if sender has sufficient balance
    if (senderWallet.total_balance < totalDeducted) {
      return NextResponse.json(
        { error: `Insufficient balance. Required: $${totalDeducted.toFixed(2)}, Available: $${senderWallet.total_balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Calculate new balances
    const newSenderBalance = senderWallet.total_balance - totalDeducted;
    const newRecipientBalance = recipientWallet.total_balance + transferAmount;

    // Generate unique transaction ID for this transfer
    const transferTransactionId = crypto.randomUUID();

    // Debit sender's wallet (this affects portfolio_value since it's a transfer to another user)
    const { error: senderDebitError } = await supabaseAdmin
      .rpc('debit_user_wallet', {
        user_email_param: senderEmail,
        amount_param: totalDeducted,
        transaction_id_param: transferTransactionId,
        transaction_type_param: 'transfer_to_user', // This will decrease portfolio_value
        description_param: `Transfer to ${recipientEmail} (${recipientWalletAddress})${note ? ` - ${note}` : ''}`
      });

    if (senderDebitError) {
      console.error('Error debiting sender wallet:', senderDebitError);
      return NextResponse.json(
        { error: 'Failed to process transfer - insufficient funds or wallet error' },
        { status: 500 }
      );
    }

    // Credit recipient's wallet (this affects portfolio_value since it's a transfer from another user)
    const { error: recipientCreditError } = await supabaseAdmin
      .rpc('credit_user_wallet', {
        user_email_param: recipientEmail,
        amount_param: transferAmount,
        transaction_id_param: transferTransactionId,
        transaction_type_param: 'transfer_from_user', // This will increase portfolio_value
        description_param: `Transfer from ${senderEmail}${note ? ` - ${note}` : ''}`
      });

    if (recipientCreditError) {
      console.error('Error crediting recipient wallet:', recipientCreditError);

      // Rollback sender debit by crediting back the amount
      await supabaseAdmin
        .rpc('credit_user_wallet', {
          user_email_param: senderEmail,
          amount_param: totalDeducted,
          transaction_id_param: `${transferTransactionId}_rollback`,
          transaction_type_param: 'transfer_rollback',
          description_param: `Rollback failed transfer to ${recipientEmail}`
        });

      return NextResponse.json(
        { error: 'Failed to process transfer to recipient' },
        { status: 500 }
      );
    }

    // Record the transaction in transfer history
    const transferRecord = {
      sender_email: senderEmail,
      recipient_email: recipientEmail,
      recipient_wallet_address: recipientWalletAddress,
      transfer_amount: transferAmount,
      fee_amount: fee,
      total_deducted: totalDeducted,
      note: note,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { error: recordError } = await supabaseAdmin
      .from('user_transfers')
      .insert(transferRecord);

    if (recordError) {
      console.error('Error recording transfer:', recordError);
      // Don't fail the transfer if recording fails, just log it
    }

    // Transaction recording is now handled automatically by the wallet functions
    console.log('✅ Transfer completed successfully using wallet functions with portfolio_value tracking');

    return NextResponse.json({
      success: true,
      message: 'Transfer completed successfully - Portfolio values updated for both users',
      transfer: {
        senderEmail,
        recipientEmail,
        transferAmount,
        fee,
        totalDeducted,
        transactionId: transferTransactionId,
        timestamp: new Date().toISOString(),
        note: 'Portfolio values have been properly adjusted for this external transfer'
      }
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
