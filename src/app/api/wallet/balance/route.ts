import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';

// Initialize Supabase admin client with proper configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseServiceKey
  });
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: { persistSession: false }
});

// Shared function to get wallet balance
async function getWalletBalance(userEmail: string) {
  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables not configured properly');
    throw new Error('Server configuration error');
  }

  if (!userEmail) {
    console.error('❌ No userEmail provided');
    throw new Error('User email is required');
  }

  console.log('🔍 Getting calculated wallet balance for:', userEmail);

  // Get real-time calculated balance from transactions
  const { data: calculatedBalance, error: balanceError } = await supabaseAdmin
    .rpc('get_calculated_wallet_balance', {
      user_email_param: userEmail
    });

  if (balanceError) {
    console.error('❌ Error calculating wallet balance for', userEmail, ':', balanceError);
    throw new Error('Failed to calculate wallet balance');
  }

  if (!calculatedBalance || calculatedBalance.length === 0) {
    console.log('📝 No transactions found for user, returning zero balance:', userEmail);
    return {
      user_email: userEmail,
      total_balance: '0',
      tic_balance: '0',
      gic_balance: '0',
      staking_balance: '0',
      partner_wallet_balance: '0',
      last_updated: new Date().toISOString()
    };
  }

  const balance = calculatedBalance[0];

  console.log('✅ Calculated wallet balance for:', userEmail, {
    total: balance.total_balance,
    status: balance.balance_status,
    transactions: balance.transaction_count
  });

  // Return the calculated balance
  return {
    user_email: balance.user_email,
    total_balance: balance.total_balance?.toString() || '0',
    tic_balance: balance.tic_balance?.toString() || '0',
    gic_balance: balance.gic_balance?.toString() || '0',
    staking_balance: balance.staking_balance?.toString() || '0',
    partner_wallet_balance: balance.partner_wallet_balance?.toString() || '0',
    last_updated: balance.last_transaction_date?.toISOString() || new Date().toISOString()
  };
}

// GET - Get user wallet balance via query parameter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      console.error('❌ No email provided in query parameters');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and requesting their own data
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== userEmail) {
      console.error('❌ Unauthorized balance request:', {
        sessionEmail: session?.user?.email,
        requestedEmail: userEmail
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ Authenticated balance request for:', userEmail);
    const walletData = await getWalletBalance(userEmail);

    return NextResponse.json({
      wallet: walletData
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ GET wallet balance error:', error);
    const errorMessage = error.message || 'Failed to get wallet balance';
    const statusCode = error.message === 'User email is required' ? 400 :
                      error.message === 'Server configuration error' ? 500 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST - Get user wallet balance via request body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, email } = body;

    // Support both userEmail and email parameters for compatibility
    const requestedEmail = userEmail || email;

    if (!requestedEmail) {
      console.error('❌ No userEmail or email provided in request body');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and requesting their own data
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== requestedEmail) {
      console.error('❌ Unauthorized balance request:', {
        sessionEmail: session?.user?.email,
        requestedEmail
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ Authenticated balance request for:', requestedEmail);
    const walletData = await getWalletBalance(requestedEmail);

    return NextResponse.json({
      wallet: walletData
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ POST wallet balance error:', error);
    const errorMessage = error.message || 'Failed to get wallet balance';
    const statusCode = error.message === 'User email is required' ? 400 :
                      error.message === 'Server configuration error' ? 500 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
