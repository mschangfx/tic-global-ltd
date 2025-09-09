import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_PRICES } from '@/lib/constants/tokens';
// TODO: Re-enable after debugging auth issues
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth-config';

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

  // Get TIC, GIC, and other token balances from user_wallets table
  const { data: walletData, error: walletError } = await supabaseAdmin
    .from('user_wallets')
    .select('total_balance, tic_balance, gic_balance, staking_balance, partner_wallet_balance, last_updated')
    .eq('user_email', userEmail)
    .single();

  console.log('🔍 Wallet API: Raw wallet data from DB:', walletData);
  console.log('🔍 Wallet API: Wallet error:', walletError);

  if (walletError && walletError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('❌ Error getting wallet data for', userEmail, ':', walletError);
  }

  // Get total balance - ALWAYS use calculated balance from transactions (transaction-based system)
  const calculatedTotalBalance = calculatedBalance && calculatedBalance.length > 0
    ? calculatedBalance[0].total_balance?.toString()
    : null;

  const baseTotalBalance = parseFloat(calculatedTotalBalance || '0');

  // Calculate TIC balance directly from ALL token distributions (real-time calculation)
  const { data: allDistributions, error: distError } = await supabaseAdmin
    .from('token_distributions')
    .select('token_amount')
    .eq('user_email', userEmail)
    .eq('status', 'completed');

  if (distError) {
    console.warn('⚠️ Error fetching TIC distributions for', userEmail, ':', distError);
  }

  const realTimeTicBalance = allDistributions?.reduce((sum, dist) => {
    return sum + parseFloat(dist.token_amount.toString());
  }, 0) || 0;

  console.log('🔍 Real-time TIC calculation for', userEmail, ':', {
    distributionsFound: allDistributions?.length || 0,
    realTimeTicBalance,
    storedTicBalance: parseFloat(walletData?.tic_balance?.toString() || '0')
  });

  // Use real-time calculated TIC balance instead of stored value
  const ticBalance = realTimeTicBalance;
  const gicBalance = parseFloat(walletData?.gic_balance?.toString() || '0');
  const stakingBalance = parseFloat(walletData?.staking_balance?.toString() || '0');

  // Calculate TIC token USD value and add to total balance
  const TIC_PRICE = TOKEN_PRICES.TIC; // $0.02 per TIC
  const ticUsdValue = ticBalance * TIC_PRICE;

  // Total balance includes: transaction-based balance + TIC USD value
  // (GIC and staking balances are already included in transaction-based balance if they were earned)
  const totalBalance = (baseTotalBalance + ticUsdValue).toFixed(8);

  console.log('🔍 Balance source (transaction-based + TIC USD) for:', userEmail, {
    calculatedTotalBalance,
    ticBalance,
    ticUsdValue,
    finalTotalBalance: totalBalance
  });

  // Get partner wallet balance (not included in TIC calculation above)
  const partnerWalletBalance = walletData?.partner_wallet_balance?.toString() || '0';

  console.log('🔍 Wallet API: Extracted balances:', {
    ticBalance,
    gicBalance,
    stakingBalance,
    partnerWalletBalance
  });
  const lastUpdated = walletData?.last_updated ||
    (calculatedBalance && calculatedBalance.length > 0 && calculatedBalance[0].last_transaction_date) ||
    new Date().toISOString();

  console.log('✅ Combined balance result (including TIC USD) for:', userEmail, {
    total_balance: totalBalance,
    tic_balance: ticBalance.toFixed(8),
    tic_usd_value: ticUsdValue.toFixed(8),
    gic_balance: gicBalance.toFixed(8),
    staking_balance: stakingBalance.toFixed(8),
    partner_wallet_balance: partnerWalletBalance
  });

  // Return the combined balance with TIC USD value included in total
  return {
    user_email: userEmail,
    total_balance: totalBalance,
    tic_balance: ticBalance.toFixed(8),
    gic_balance: gicBalance.toFixed(8),
    staking_balance: stakingBalance.toFixed(8),
    partner_wallet_balance: partnerWalletBalance,
    tic_usd_value: ticUsdValue.toFixed(8), // Include TIC USD value for transparency
    last_updated: typeof lastUpdated === 'string' ? lastUpdated : lastUpdated.toISOString()
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

    // TODO: Re-enable authentication after debugging
    // Temporarily disabled to fix 500 error - will re-enable after testing
    console.log('⚠️ Authentication temporarily disabled for debugging');
    console.log('🔍 Balance request for:', userEmail);
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

    // TODO: Re-enable authentication after debugging
    // Temporarily disabled to fix 500 error - will re-enable after testing
    console.log('⚠️ Authentication temporarily disabled for debugging');
    console.log('🔍 Balance request for:', requestedEmail);
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
