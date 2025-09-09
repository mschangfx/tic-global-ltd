import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Debug endpoint to check wallet balance for current user
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'User not authenticated',
        session: null,
        userEmail: null
      }, { status: 401 });
    }

    const userEmail = session.user.email;

    // Get wallet balance from database
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Get recent TIC distributions for this user
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get all users with TIC balances for comparison
    const { data: allUsersWithTic, error: allUsersError } = await supabaseAdmin
      .from('user_wallets')
      .select('user_email, tic_balance, total_balance')
      .gt('tic_balance', 0)
      .order('tic_balance', { ascending: false });

    return NextResponse.json({
      debug: {
        currentUser: userEmail,
        sessionExists: !!session,
        userEmailFromSession: session.user.email
      },
      wallet: wallet || null,
      walletError: walletError?.message || null,
      recentDistributions: distributions || [],
      distributionError: distError?.message || null,
      allUsersWithTic: allUsersWithTic || [],
      comparison: {
        userHasWallet: !!wallet,
        userTicBalance: wallet?.tic_balance || 0,
        userInTicList: (allUsersWithTic || []).some(u => u.user_email === userEmail),
        totalUsersWithTic: (allUsersWithTic || []).length
      },
      recommendation: wallet?.tic_balance > 0 
        ? 'User should see TIC balance in navbar'
        : 'User has no TIC balance - need to run distribution or check user email match'
    });

  } catch (error) {
    console.error('Error in debug wallet balance:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
