import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// POST - Transfer from partner wallet to main wallet
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // If no NextAuth session, try Supabase auth
    if (!userEmail) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid transfer amount' },
        { status: 400 }
      );
    }

    // Get current partner wallet balance to verify sufficient funds
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('partner_wallet_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Error fetching wallet data:', walletError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet data' },
        { status: 500 }
      );
    }

    const currentPartnerBalance = parseFloat(walletData?.partner_wallet_balance || '0');

    if (currentPartnerBalance < amount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient partner wallet balance' },
        { status: 400 }
      );
    }

    // Use the database function to transfer funds
    const { data, error } = await supabaseAdmin
      .rpc('transfer_partner_to_main_wallet', {
        user_email_param: userEmail,
        transfer_amount_param: amount
      });

    if (error) {
      console.error('Error transferring from partner wallet:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Transfer failed' },
        { status: 500 }
      );
    }

    // Get updated wallet balances
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from('user_wallets')
      .select('total_balance, partner_wallet_balance')
      .eq('user_email', userEmail)
      .single();

    if (updateError) {
      console.error('Error fetching updated wallet:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred $${amount.toFixed(2)} from Partner Wallet to Main Wallet`,
      data: {
        transfer_amount: amount,
        user_email: userEmail,
        new_main_balance: updatedWallet?.total_balance || 0,
        new_partner_balance: updatedWallet?.partner_wallet_balance || 0
      }
    });

  } catch (error) {
    console.error('Error in partner wallet transfer API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get partner wallet balance and transfer history
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // If no NextAuth session, try Supabase auth
    if (!userEmail) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get current partner wallet balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('partner_wallet_balance, total_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Error fetching wallet data:', walletError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet data' },
        { status: 500 }
      );
    }

    // Get transfer history from wallet_transactions
    const { data: transfers, error: transferError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('transaction_type', 'transfer')
      .contains('metadata', { transfer_type: 'partner_to_main' })
      .order('created_at', { ascending: false })
      .limit(20);

    if (transferError) {
      console.error('Error fetching transfer history:', transferError);
    }

    return NextResponse.json({
      success: true,
      data: {
        partner_balance: parseFloat(walletData?.partner_wallet_balance || '0'),
        main_balance: parseFloat(walletData?.total_balance || '0'),
        transfer_history: transfers || []
      }
    });

  } catch (error) {
    console.error('Error in partner wallet GET API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
