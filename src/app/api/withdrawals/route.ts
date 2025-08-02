import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import TransactionService from '@/lib/services/transactionService';

// Helper function to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 1: Try Supabase auth (manual login) - this works reliably
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 2: Try NextAuth session (Google OAuth) - fallback
    try {
      const nextAuthSession = await getServerSession(authOptions as any);
      if ((nextAuthSession as any)?.user?.email) {
        return (nextAuthSession as any).user.email;
      }
    } catch (nextAuthError) {
      console.log('NextAuth session not available:', nextAuthError);
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// GET - Get withdrawal methods or user's withdrawal history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'methods';
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const transactionId = searchParams.get('transactionId');

    const supabase = createClient();

    if (type === 'methods') {
      // Get available withdrawal methods
      const { data: methods, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching withdrawal methods:', error);
        return NextResponse.json(
          { error: 'Failed to fetch withdrawal methods' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        methods: methods || [],
        count: methods?.length || 0
      });
    } else if (type === 'history') {
      // Get user's withdrawal history
      const userEmail = await getAuthenticatedUserEmail();
      if (!userEmail) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        );
      }

      // Use service role client for database queries
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Build query for user's withdrawals (without join for now)
      let query = supabaseAdmin
        .from('withdrawal_requests')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply status filter
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply transaction ID filter
      if (transactionId) {
        query = query.eq('transaction_id', transactionId);
      }

      const { data: withdrawals, error } = await query;

      if (error) {
        console.error('Error fetching user withdrawals:', error);
        return NextResponse.json(
          { error: 'Failed to fetch withdrawals' },
          { status: 500 }
        );
      }

      // Get user's wallet balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('user_wallets')
        .select('*')
        .eq('user_email', userEmail)
        .single();

      // Calculate withdrawal statistics
      const totalWithdrawals = withdrawals?.length || 0;
      const totalAmount = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
      const completedWithdrawals = withdrawals?.filter(w => w.status === 'completed').length || 0;

      return NextResponse.json({
        success: true,
        withdrawals: withdrawals || [],
        wallet: {
          total_balance: wallet?.total_balance || 0,
          tic_balance: wallet?.tic_balance || 0,
          gic_balance: wallet?.gic_balance || 0,
          staking_balance: wallet?.staking_balance || 0,
          pending_withdrawals: wallet?.pending_withdrawals || 0
        },
        statistics: {
          total_withdrawals: totalWithdrawals,
          total_amount: totalAmount,
          pending_withdrawals: pendingWithdrawals,
          completed_withdrawals: completedWithdrawals,
          success_rate: totalWithdrawals > 0 ? (completedWithdrawals / totalWithdrawals * 100).toFixed(1) : '0'
        },
        pagination: {
          limit,
          offset,
          hasMore: withdrawals?.length === limit
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use: methods or history' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in withdrawals API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create withdrawal request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, destinationAddress, amount } = body;

    if (!methodId || !destinationAddress || !amount) {
      return NextResponse.json(
        { error: 'Method ID, destination address, and amount are required' },
        { status: 400 }
      );
    }

    // Get authenticated user email using hybrid approach
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role client for database queries
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Get payment method details
    const { data: method, error: methodError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('method_id', methodId)
      .eq('is_active', true)
      .single();

    if (methodError || !method) {
      return NextResponse.json(
        { error: 'Payment method not found or inactive' },
        { status: 404 }
      );
    }

    // Validate amount limits
    if (withdrawalAmount < method.min_amount) {
      return NextResponse.json(
        { 
          error: `Minimum withdrawal amount is $${method.min_amount}`,
          min_amount: method.min_amount
        },
        { status: 400 }
      );
    }

    if (withdrawalAmount > method.max_amount) {
      return NextResponse.json(
        { 
          error: `Maximum withdrawal amount is $${method.max_amount}`,
          max_amount: method.max_amount
        },
        { status: 400 }
      );
    }

    // Get user wallet
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 404 }
      );
    }

    // Check sufficient balance
    if (wallet.total_balance < withdrawalAmount) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          required: withdrawalAmount,
          available: wallet.total_balance,
          shortfall: withdrawalAmount - wallet.total_balance
        },
        { status: 400 }
      );
    }

    // Create transaction record
    const transactionService = TransactionService.getInstance();
    const transaction = await transactionService.createTransaction({
      user_email: userEmail,
      transaction_type: 'withdrawal',
      amount: withdrawalAmount,
      currency: 'USD',
      network: method.network,
      wallet_address: destinationAddress,
      user_wallet_address: destinationAddress,
      processing_fee: withdrawalAmount * method.processing_fee_rate + method.fixed_fee,
      network_fee: 0,
      request_metadata: {
        method_id: methodId,
        method_name: method.name,
        destination_address: destinationAddress,
        withdrawal_type: 'user_request'
      }
    });

    // Process withdrawal using database function
    const { data: withdrawalId, error: withdrawalError } = await supabase
      .rpc('process_withdrawal_request', {
        user_email_param: userEmail,
        method_id_param: methodId,
        destination_address_param: destinationAddress,
        amount_param: withdrawalAmount,
        transaction_id_param: transaction.id
      });

    if (withdrawalError) {
      console.error('Error processing withdrawal:', withdrawalError);
      
      // Update transaction status to failed
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          admin_notes: withdrawalError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      return NextResponse.json(
        { error: withdrawalError.message || 'Withdrawal processing failed' },
        { status: 400 }
      );
    }

    // Get the created withdrawal request
    const { data: withdrawalRequest, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        payment_methods (
          name,
          network,
          symbol,
          processing_time
        )
      `)
      .eq('id', withdrawalId)
      .single();

    if (fetchError) {
      console.error('Error fetching withdrawal request:', fetchError);
    }

    // Get updated wallet balance
    const { data: updatedWallet } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    return NextResponse.json({
      success: true,
      message: `Withdrawal request submitted successfully! Processing time: ${method.processing_time}`,
      withdrawal: withdrawalRequest || {
        id: withdrawalId,
        amount: withdrawalAmount,
        destination_address: destinationAddress,
        status: 'pending',
        method: method
      },
      transaction: {
        id: transaction.id,
        amount: withdrawalAmount,
        status: 'pending',
        created_at: transaction.created_at
      },
      wallet: {
        previous_balance: wallet.total_balance,
        current_balance: updatedWallet?.total_balance || 0,
        amount_withdrawn: withdrawalAmount
      }
    });

  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Cancel withdrawal request (only pending withdrawals)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { withdrawalId, reason } = body;

    if (!withdrawalId) {
      return NextResponse.json(
        { error: 'Withdrawal ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user email using hybrid approach
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role client for database queries
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if withdrawal belongs to user and is pending
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .eq('user_email', userEmail)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal request not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending withdrawals
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending withdrawals can be cancelled' },
        { status: 400 }
      );
    }

    // Update withdrawal status
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'cancelled',
        admin_notes: `Cancelled by user: ${reason || 'No reason provided'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)
      .eq('user_email', userEmail)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling withdrawal:', error);
      return NextResponse.json(
        { error: 'Failed to cancel withdrawal' },
        { status: 500 }
      );
    }

    // Update related transaction
    await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        admin_notes: `Withdrawal cancelled by user: ${reason || 'No reason provided'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.transaction_id);

    // Refund the amount to user's wallet
    await supabase
      .rpc('credit_user_wallet', {
        user_email_param: userEmail,
        amount_param: withdrawal.amount,
        transaction_id_param: withdrawal.transaction_id,
        description_param: `Withdrawal cancellation refund: $${withdrawal.amount}`
      });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal cancelled successfully and amount refunded',
      withdrawal: data
    });

  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
