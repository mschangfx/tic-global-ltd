import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { email, updates } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get current wallet data
    const { data: currentWallet, error: fetchError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', email)
      .single();

    if (fetchError) {
      console.error('Error fetching current wallet:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current wallet data' },
        { status: 500 }
      );
    }

    if (!currentWallet) {
      return NextResponse.json(
        { error: 'Wallet not found for user' },
        { status: 404 }
      );
    }

    // Prepare update object with only the fields that are being updated
    const updateData: any = {};
    
    if (updates.total !== undefined) {
      updateData.total_balance = updates.total;
    }
    
    if (updates.tic_balance !== undefined) {
      updateData.tic_balance = updates.tic_balance;
    }
    
    if (updates.gic_balance !== undefined) {
      updateData.gic_balance = updates.gic_balance;
    }
    
    if (updates.staking !== undefined) {
      updateData.staking_balance = updates.staking;
    }

    // Always update the last_updated timestamp
    updateData.last_updated = new Date().toISOString();

    // Validate that no balances go negative
    const finalBalances = {
      total_balance: updateData.total_balance !== undefined ? updateData.total_balance : currentWallet.total_balance,
      tic_balance: updateData.tic_balance !== undefined ? updateData.tic_balance : currentWallet.tic_balance,
      gic_balance: updateData.gic_balance !== undefined ? updateData.gic_balance : currentWallet.gic_balance,
      staking_balance: updateData.staking_balance !== undefined ? updateData.staking_balance : currentWallet.staking_balance,
    };

    // Check for negative balances
    if (finalBalances.total_balance < 0) {
      return NextResponse.json(
        { error: 'Insufficient balance in main wallet' },
        { status: 400 }
      );
    }
    
    if (finalBalances.tic_balance < 0) {
      return NextResponse.json(
        { error: 'Insufficient TIC balance' },
        { status: 400 }
      );
    }
    
    if (finalBalances.gic_balance < 0) {
      return NextResponse.json(
        { error: 'Insufficient GIC balance' },
        { status: 400 }
      );
    }
    
    if (finalBalances.staking_balance < 0) {
      return NextResponse.json(
        { error: 'Insufficient staking balance' },
        { status: 400 }
      );
    }

    // Update the wallet
    const { data: updatedWallet, error: updateError } = await supabase
      .from('user_wallets')
      .update(updateData)
      .eq('user_email', email)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return NextResponse.json(
        { error: 'Failed to update wallet balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet balance updated successfully',
      wallet: updatedWallet,
      updatedFields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('Wallet update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
