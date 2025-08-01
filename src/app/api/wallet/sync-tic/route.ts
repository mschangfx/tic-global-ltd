import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Sync TIC balance with total distributions
export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Syncing TIC balance for:', userEmail);

    // Get total TIC tokens distributed to user
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('token_amount')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (distError) {
      console.error('Error fetching distributions:', distError);
      return NextResponse.json(
        { error: 'Failed to fetch token distributions' },
        { status: 500 }
      );
    }

    // Calculate total TIC tokens earned
    const totalTicEarned = distributions?.reduce(
      (sum, dist) => sum + parseFloat(dist.token_amount.toString()), 
      0
    ) || 0;

    console.log('📊 Total TIC earned from distributions:', totalTicEarned);

    // Get current TIC balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('tic_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 404 }
      );
    }

    const currentTicBalance = parseFloat(wallet.tic_balance.toString()) || 0;
    console.log('📊 Current TIC balance:', currentTicBalance);

    // Check if sync is needed
    if (Math.abs(currentTicBalance - totalTicEarned) < 0.001) {
      console.log('✅ TIC balance already in sync');
      return NextResponse.json({
        success: true,
        message: 'TIC balance already in sync',
        currentBalance: currentTicBalance,
        totalEarned: totalTicEarned,
        syncNeeded: false
      });
    }

    // Update TIC balance to match total distributions
    const { error: updateError } = await supabaseAdmin
      .from('user_wallets')
      .update({
        tic_balance: totalTicEarned,
        last_updated: new Date().toISOString()
      })
      .eq('user_email', userEmail);

    if (updateError) {
      console.error('Error updating TIC balance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update TIC balance' },
        { status: 500 }
      );
    }

    console.log('✅ TIC balance synced successfully');

    return NextResponse.json({
      success: true,
      message: 'TIC balance synced successfully',
      previousBalance: currentTicBalance,
      newBalance: totalTicEarned,
      difference: totalTicEarned - currentTicBalance,
      totalDistributions: distributions?.length || 0,
      syncNeeded: true
    });

  } catch (error) {
    console.error('Error syncing TIC balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check TIC balance sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Get total TIC tokens distributed
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('token_amount')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (distError) {
      return NextResponse.json(
        { error: 'Failed to fetch distributions' },
        { status: 500 }
      );
    }

    const totalTicEarned = distributions?.reduce(
      (sum, dist) => sum + parseFloat(dist.token_amount.toString()), 
      0
    ) || 0;

    // Get current TIC balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('tic_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 404 }
      );
    }

    const currentTicBalance = parseFloat(wallet.tic_balance.toString()) || 0;
    const difference = totalTicEarned - currentTicBalance;
    const syncNeeded = Math.abs(difference) >= 0.001;

    return NextResponse.json({
      success: true,
      currentBalance: currentTicBalance,
      totalEarned: totalTicEarned,
      difference: difference,
      syncNeeded: syncNeeded,
      distributionCount: distributions?.length || 0
    });

  } catch (error) {
    console.error('Error checking TIC sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
