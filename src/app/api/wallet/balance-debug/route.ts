import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createClient as createRegularClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Helper function to get authenticated user email
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 1: Try Supabase auth (manual login)
    try {
      const supabase = createRegularClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 2: Try NextAuth session (Google OAuth)
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

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user email
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 Getting balance debug info for:', userEmail);

    // Get stored balance from user_wallets table
    const { data: storedWallet, error: storedError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    // Get calculated balance from transactions
    const { data: calculatedBalance, error: calculatedError } = await supabaseAdmin
      .rpc('get_calculated_wallet_balance', {
        user_email_param: userEmail
      });

    // Get transaction summary
    const { data: deposits, error: depositsError } = await supabaseAdmin
      .from('deposits')
      .select('id, amount, final_amount, status, created_at')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    const { data: withdrawals, error: withdrawalsError } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('id, amount, final_amount, status, created_at')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    const { data: walletTransactions, error: walletTxError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(20);

    const calculated = calculatedBalance?.[0];
    const storedBalance = parseFloat(storedWallet?.total_balance || '0');
    const calculatedBalanceValue = parseFloat(calculated?.total_balance?.toString() || '0');
    const difference = calculatedBalanceValue - storedBalance;

    return NextResponse.json({
      success: true,
      userEmail,
      balances: {
        stored: {
          total: storedBalance,
          tic: parseFloat(storedWallet?.tic_balance || '0'),
          gic: parseFloat(storedWallet?.gic_balance || '0'),
          staking: parseFloat(storedWallet?.staking_balance || '0'),
          partner: parseFloat(storedWallet?.partner_wallet_balance || '0'),
          lastUpdated: storedWallet?.last_updated
        },
        calculated: {
          total: calculatedBalanceValue,
          tic: parseFloat(calculated?.tic_balance?.toString() || '0'),
          gic: parseFloat(calculated?.gic_balance?.toString() || '0'),
          staking: parseFloat(calculated?.staking_balance?.toString() || '0'),
          partner: parseFloat(calculated?.partner_wallet_balance?.toString() || '0'),
          transactionCount: calculated?.transaction_count || 0,
          lastTransaction: calculated?.last_transaction_date,
          status: calculated?.balance_status || 'NO_DATA'
        },
        difference: {
          amount: difference,
          percentage: storedBalance !== 0 ? (difference / storedBalance) * 100 : 0,
          status: Math.abs(difference) > 0.01 ? 'MISMATCH' : 'BALANCED'
        }
      },
      transactions: {
        deposits: {
          total: deposits?.length || 0,
          completed: deposits?.filter(d => d.status === 'completed').length || 0,
          pending: deposits?.filter(d => d.status === 'pending').length || 0,
          recent: deposits?.slice(0, 5) || []
        },
        withdrawals: {
          total: withdrawals?.length || 0,
          completed: withdrawals?.filter(w => w.status === 'completed').length || 0,
          pending: withdrawals?.filter(w => w.status === 'pending').length || 0,
          recent: withdrawals?.slice(0, 5) || []
        },
        walletTransactions: {
          total: walletTransactions?.length || 0,
          recent: walletTransactions?.slice(0, 10) || []
        }
      },
      errors: {
        stored: storedError?.message,
        calculated: calculatedError?.message,
        deposits: depositsError?.message,
        withdrawals: withdrawalsError?.message,
        walletTx: walletTxError?.message
      }
    });

  } catch (error) {
    console.error('Error in balance debug API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Admin endpoint to debug any user's balance
export async function POST(request: NextRequest) {
  try {
    const { userEmail: targetUserEmail, adminKey } = await request.json();

    // Simple admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    if (!targetUserEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 Admin getting balance debug info for:', targetUserEmail);

    // Get all balance information (same logic as GET endpoint)
    const { data: storedWallet } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', targetUserEmail)
      .maybeSingle();

    const { data: calculatedBalance } = await supabaseAdmin
      .rpc('get_calculated_wallet_balance', {
        user_email_param: targetUserEmail
      });

    const calculated = calculatedBalance?.[0];
    const storedBalance = parseFloat(storedWallet?.total_balance || '0');
    const calculatedBalanceValue = parseFloat(calculated?.total_balance?.toString() || '0');
    const difference = calculatedBalanceValue - storedBalance;

    return NextResponse.json({
      success: true,
      userEmail: targetUserEmail,
      balances: {
        stored: {
          total: storedBalance,
          tic: parseFloat(storedWallet?.tic_balance || '0'),
          gic: parseFloat(storedWallet?.gic_balance || '0'),
          staking: parseFloat(storedWallet?.staking_balance || '0'),
          partner: parseFloat(storedWallet?.partner_wallet_balance || '0'),
          lastUpdated: storedWallet?.last_updated
        },
        calculated: {
          total: calculatedBalanceValue,
          tic: parseFloat(calculated?.tic_balance?.toString() || '0'),
          gic: parseFloat(calculated?.gic_balance?.toString() || '0'),
          staking: parseFloat(calculated?.staking_balance?.toString() || '0'),
          partner: parseFloat(calculated?.partner_wallet_balance?.toString() || '0'),
          transactionCount: calculated?.transaction_count || 0,
          lastTransaction: calculated?.last_transaction_date,
          status: calculated?.balance_status || 'NO_DATA'
        },
        difference: {
          amount: difference,
          percentage: storedBalance !== 0 ? (difference / storedBalance) * 100 : 0,
          status: Math.abs(difference) > 0.01 ? 'MISMATCH' : 'BALANCED'
        }
      }
    });

  } catch (error) {
    console.error('Error in admin balance debug API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
