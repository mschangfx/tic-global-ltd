import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

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

// GET - Get user's deposit history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const transactionId = searchParams.get('transactionId');

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

    // Build query for user's deposits
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        currency,
        network,
        wallet_address,
        transaction_hash,
        status,
        processing_fee,
        network_fee,
        final_amount,
        admin_notes,
        approved_by,
        approved_at,
        created_at,
        updated_at,
        request_metadata
      `)
      .eq('user_email', userEmail)
      .eq('transaction_type', 'deposit')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by specific transaction ID if provided
    if (transactionId) {
      query = query.eq('id', transactionId);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching user deposits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deposits' },
        { status: 500 }
      );
    }

    // Get user's wallet balance and transaction history
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    const { data: walletTransactions, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('transaction_type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate deposit statistics
    const totalDeposits = deposits?.length || 0;
    const totalAmount = deposits?.reduce((sum, deposit) => sum + (deposit.final_amount || deposit.amount), 0) || 0;
    const pendingDeposits = deposits?.filter(d => d.status === 'pending').length || 0;
    const approvedDeposits = deposits?.filter(d => d.status === 'approved' || d.status === 'completed').length || 0;

    return NextResponse.json({
      success: true,
      deposits: deposits || [],
      wallet: {
        total_balance: walletData?.total_balance || 0,
        tic_balance: walletData?.tic_balance || 0,
        gic_balance: walletData?.gic_balance || 0,
        staking_balance: walletData?.staking_balance || 0,
        last_updated: walletData?.last_updated || null
      },
      wallet_transactions: walletTransactions || [],
      statistics: {
        total_deposits: totalDeposits,
        total_amount: totalAmount,
        pending_deposits: pendingDeposits,
        approved_deposits: approvedDeposits,
        success_rate: totalDeposits > 0 ? (approvedDeposits / totalDeposits * 100).toFixed(1) : '0'
      },
      pagination: {
        limit,
        offset,
        hasMore: deposits?.length === limit
      }
    });

  } catch (error) {
    console.error('Error in user deposits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new deposit request (alternative to main deposits API)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, amount } = body;

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

    // Validate required fields
    if (!methodId || !amount) {
      return NextResponse.json(
        { error: 'Method ID and amount are required' },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    // Use the main deposits API
    const depositResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/api/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization headers to maintain authentication context
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        methodId: methodId,
        amount: depositAmount
      })
    });

    const depositData = await depositResponse.json();
    
    if (!depositData.success) {
      return NextResponse.json(
        { error: depositData.error || 'Failed to create deposit request' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit request created successfully',
      transaction: depositData.transaction,
      method: depositData.method
    });

  } catch (error) {
    console.error('Error creating user deposit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Cancel a pending deposit (user can cancel their own pending deposits)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, reason } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
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

    // Check if transaction exists and belongs to user
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_email', userEmail)
      .eq('transaction_type', 'deposit')
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Deposit transaction not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending deposits
    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending deposits can be cancelled' },
        { status: 400 }
      );
    }

    // Update transaction status to cancelled
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        admin_notes: `Cancelled by user: ${reason || 'No reason provided'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('user_email', userEmail)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling deposit:', error);
      return NextResponse.json(
        { error: 'Failed to cancel deposit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit cancelled successfully',
      transaction: data
    });

  } catch (error) {
    console.error('Error cancelling deposit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
