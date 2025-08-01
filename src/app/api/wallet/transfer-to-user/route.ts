import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

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

    const supabase = createClient();

    // Get sender's current wallet balance
    const { data: senderWallet, error: senderError } = await supabase
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
    const { data: recipientWallet, error: recipientError } = await supabase
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
    const { data: recipientAddress, error: addressError } = await supabase
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

    // Update sender's balance (deduct transfer amount + fee)
    const { error: senderUpdateError } = await supabase
      .from('user_wallets')
      .update({
        total_balance: newSenderBalance,
        last_updated: new Date().toISOString()
      })
      .eq('user_email', senderEmail);

    if (senderUpdateError) {
      console.error('Error updating sender balance:', senderUpdateError);
      return NextResponse.json(
        { error: 'Failed to update sender balance' },
        { status: 500 }
      );
    }

    // Update recipient's balance (add transfer amount)
    const { error: recipientUpdateError } = await supabase
      .from('user_wallets')
      .update({
        total_balance: newRecipientBalance,
        last_updated: new Date().toISOString()
      })
      .eq('user_email', recipientEmail);

    if (recipientUpdateError) {
      console.error('Error updating recipient balance:', recipientUpdateError);
      
      // Rollback sender balance update
      await supabase
        .from('user_wallets')
        .update({
          total_balance: senderWallet.total_balance,
          last_updated: new Date().toISOString()
        })
        .eq('user_email', senderEmail);

      return NextResponse.json(
        { error: 'Failed to update recipient balance' },
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

    const { error: recordError } = await supabase
      .from('user_transfers')
      .insert(transferRecord);

    if (recordError) {
      console.error('Error recording transfer:', recordError);
      // Don't fail the transfer if recording fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer completed successfully',
      transfer: {
        senderEmail,
        recipientEmail,
        transferAmount,
        fee,
        totalDeducted,
        senderNewBalance: newSenderBalance,
        recipientNewBalance: newRecipientBalance,
        timestamp: new Date().toISOString()
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
