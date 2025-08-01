import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Create a test deposit for TRC20 automation testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, transaction_hash } = body;

    const supabase = createClient();

    // Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Missing required field: amount' },
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

    const minDeposit = 10;
    const maxDeposit = 200000;
    
    if (depositAmount < minDeposit || depositAmount > maxDeposit) {
      return NextResponse.json(
        { error: `Deposit amount must be between ${minDeposit} and ${maxDeposit} USDT` },
        { status: 400 }
      );
    }

    // Remove duplicate supabase initialization since we already have it above

    // Generate transaction hash if not provided
    const txHash = transaction_hash || `test_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create deposit record
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_email: user.email,
        amount: depositAmount,
        currency: 'USD',
        method_id: 'usdt-trc20',
        method_name: 'USDT',
        network: 'TRC20',
        deposit_address: 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ',
        transaction_hash: txHash,
        confirmation_count: 0,
        required_confirmations: 1,
        status: 'pending',
        final_amount: depositAmount,
        admin_notes: 'Test deposit created via API',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (depositError) {
      console.error('Error creating deposit:', depositError);
      return NextResponse.json(
        { error: 'Failed to create deposit' },
        { status: 500 }
      );
    }

    console.log(`✅ Test deposit created: ${deposit.id} - ${depositAmount} USDT for ${user_email}`);

    return NextResponse.json({
      success: true,
      message: 'Test deposit created successfully',
      deposit: {
        id: deposit.id,
        user_email,
        amount: depositAmount,
        transaction_hash: txHash,
        status: 'pending',
        deposit_address: 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ',
        created_at: deposit.created_at,
        note: 'This deposit will be automatically processed by the TRC20 automation service'
      }
    });

  } catch (error) {
    console.error('Create deposit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check recent deposits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('user_email');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createClient();

    let query = supabase
      .from('deposits')
      .select('*')
      .eq('method_id', 'usdt-trc20')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching deposits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deposits' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deposits: deposits.map(deposit => ({
        id: deposit.id,
        user_email: deposit.user_email,
        amount: deposit.amount,
        status: deposit.status,
        transaction_hash: deposit.transaction_hash,
        confirmation_count: deposit.confirmation_count,
        created_at: deposit.created_at,
        updated_at: deposit.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fetching deposits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
