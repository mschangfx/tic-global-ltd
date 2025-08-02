import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// GET - Get ranking bonus history for authenticated user
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get ranking bonus history
    const { data: bonusHistory, error: historyError } = await supabaseAdmin
      .rpc('get_ranking_bonus_history', {
        user_email_param: userEmail,
        limit_param: limit
      });

    if (historyError) {
      console.error('Error fetching ranking bonus history:', historyError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ranking bonus history' },
        { status: 500 }
      );
    }

    // Get current wallet balances for context
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('tic_balance, gic_balance, total_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Error fetching wallet data:', walletError);
    }

    // Calculate total ranking bonuses earned
    const totalTicEarned = bonusHistory?.filter((h: any) => h.token_type === 'TIC')
      .reduce((sum: number, h: any) => sum + parseFloat(h.amount), 0) || 0;

    const totalGicEarned = bonusHistory?.filter((h: any) => h.token_type === 'GIC')
      .reduce((sum: number, h: any) => sum + parseFloat(h.amount), 0) || 0;

    const totalBonusEarned = totalTicEarned + totalGicEarned;

    return NextResponse.json({
      success: true,
      data: {
        bonusHistory: bonusHistory || [],
        summary: {
          totalBonusEarned: totalBonusEarned,
          totalTicEarned: totalTicEarned,
          totalGicEarned: totalGicEarned,
          transactionCount: bonusHistory?.length || 0
        },
        currentWallet: {
          ticBalance: parseFloat(wallet?.tic_balance || '0'),
          gicBalance: parseFloat(wallet?.gic_balance || '0'),
          totalBalance: parseFloat(wallet?.total_balance || '0')
        }
      }
    });

  } catch (error) {
    console.error('Error fetching ranking bonus history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
