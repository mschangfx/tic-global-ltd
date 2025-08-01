import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's rank bonus history
    const { data: bonusHistory, error: historyError } = await supabase
      .from('user_rank_bonus_history')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (historyError) {
      throw new Error(`Error fetching bonus history: ${historyError.message}`);
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('rank_bonus_distributions')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail);

    if (countError) {
      console.error('Error getting count:', countError);
    }

    // Calculate summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('rank_bonus_distributions')
      .select('bonus_amount, tic_amount, gic_amount, status')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    let summary = {
      totalBonusReceived: 0,
      totalTicReceived: 0,
      totalGicReceived: 0,
      totalDistributions: 0,
      lastDistribution: null as any
    };

    if (summaryData && !summaryError) {
      summary = {
        totalBonusReceived: summaryData.reduce((sum, item) => sum + parseFloat(item.bonus_amount), 0),
        totalTicReceived: summaryData.reduce((sum, item) => sum + parseFloat(item.tic_amount), 0),
        totalGicReceived: summaryData.reduce((sum, item) => sum + parseFloat(item.gic_amount), 0),
        totalDistributions: summaryData.length,
        lastDistribution: bonusHistory?.[0] || null
      };
    }

    // Get current user rank info
    const { data: referralData, error: referralError } = await supabase
      .from('referral_relationships')
      .select('*')
      .eq('referrer_email', userEmail)
      .eq('is_active', true);

    const totalReferrals = referralData?.length || 0;
    const currentRank = getUserRank(totalReferrals);
    const currentBonusAmount = getRankBonusAmount(currentRank);

    return NextResponse.json({
      success: true,
      data: {
        history: bonusHistory || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        },
        summary,
        currentStatus: {
          rank: currentRank,
          totalReferrals,
          monthlyBonusAmount: currentBonusAmount,
          nextBonusEligible: currentBonusAmount > 0,
          ticPerMonth: currentBonusAmount / 2,
          gicPerMonth: currentBonusAmount / 2
        }
      }
    });

  } catch (error) {
    console.error('Error fetching rank bonus history:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getUserRank(totalReferrals: number): string {
  if (totalReferrals === 0) return 'Common';
  if (totalReferrals >= 1 && totalReferrals <= 10) return 'Advance';
  if (totalReferrals >= 11 && totalReferrals < 12) return 'Bronze';
  if (totalReferrals >= 12 && totalReferrals < 13) return 'Silver';
  if (totalReferrals >= 13 && totalReferrals < 14) return 'Gold';
  if (totalReferrals >= 14 && totalReferrals < 15) return 'Platinum';
  if (totalReferrals >= 15) return 'Diamond';
  return 'Common';
}

function getRankBonusAmount(rank: string): number {
  const bonuses: { [key: string]: number } = {
    'Bronze': 690,
    'Silver': 2484,
    'Gold': 4830,
    'Platinum': 8832,
    'Diamond': 14904
  };
  return bonuses[rank] || 0;
}
