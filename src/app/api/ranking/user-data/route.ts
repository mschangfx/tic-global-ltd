import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rank thresholds and requirements
const RANK_REQUIREMENTS = {
  starter: { activePlayers: 0, groups: 0, volume: 0 },
  bronze: { activePlayers: 5, groups: 2, volume: 13800 },
  silver: { activePlayers: 5, groups: 3, volume: 41400 },
  gold: { activePlayers: 6, groups: 3, volume: 69000 },
  platinum: { activePlayers: 8, groups: 4, volume: 110400 },
  diamond: { activePlayers: 12, groups: 5, volume: 165600 }
};

const RANK_ORDER = ['starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];

function calculateUserRank(activePlayers: number, groups: number, volume: number): string {
  // Check from highest rank down
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    const rank = RANK_ORDER[i];
    const requirements = RANK_REQUIREMENTS[rank as keyof typeof RANK_REQUIREMENTS];
    
    if (activePlayers >= requirements.activePlayers && 
        groups >= requirements.groups && 
        volume >= requirements.volume) {
      return rank;
    }
  }
  
  return 'starter';
}

function getNextRank(currentRank: string): string {
  const currentIndex = RANK_ORDER.indexOf(currentRank);
  if (currentIndex < RANK_ORDER.length - 1) {
    return RANK_ORDER[currentIndex + 1];
  }
  return currentRank; // Already at highest rank
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Get user's referral code first
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('referral_code, current_rank')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const referralCode = user.referral_code;

    // Get referral statistics
    const stats = await calculateRankingStats(email, referralCode);

    // Calculate current rank based on achievements
    const calculatedRank = calculateUserRank(
      stats.activePlayers, 
      stats.groupsFormed.length, 
      stats.currentVolume
    );

    // Update user's rank if it has changed
    if (user.current_rank !== calculatedRank) {
      await supabaseAdmin
        .from('users')
        .update({ 
          current_rank: calculatedRank,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
    }

    const nextRank = getNextRank(calculatedRank);

    return NextResponse.json({
      currentRank: calculatedRank,
      nextRank: nextRank,
      activePlayers: stats.activePlayers,
      currentVolume: stats.currentVolume,
      groupsFormed: stats.groupsFormed,
      totalReferrals: stats.totalReferrals,
      monthlyEarnings: stats.monthlyEarnings
    });

  } catch (error) {
    console.error('Error in ranking user-data API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function calculateRankingStats(userEmail: string, referralCode: string) {
  try {
    // Get total referrals count
    const { count: totalReferrals } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referral_id', referralCode);

    // Get active referrals (users who are verified and have made purchases)
    const { count: activeReferrals } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referral_id', referralCode)
      .eq('email_verified', true);

    // Calculate team volume (mock calculation - in real app, this would be based on actual purchases)
    const teamVolume = (activeReferrals || 0) * 2760; // Average package value

    // Calculate groups formed (simplified - in real app, this would be more complex)
    // For now, assume 1 group per 3 active players
    const groupsFormed = [];
    const groupCount = Math.floor((activeReferrals || 0) / 3);
    for (let i = 0; i < Math.min(groupCount, 5); i++) {
      groupsFormed.push(String.fromCharCode(65 + i)); // A, B, C, D, E
    }

    // Calculate monthly earnings based on current achievements
    const monthlyEarnings = calculateMonthlyEarnings(activeReferrals || 0, teamVolume);

    return {
      totalReferrals: totalReferrals || 0,
      activePlayers: activeReferrals || 0,
      currentVolume: teamVolume,
      groupsFormed: groupsFormed,
      monthlyEarnings: monthlyEarnings
    };

  } catch (error) {
    console.error('Error calculating ranking stats:', error);
    return {
      totalReferrals: 0,
      activePlayers: 0,
      currentVolume: 0,
      groupsFormed: [],
      monthlyEarnings: 0
    };
  }
}

function calculateMonthlyEarnings(activePlayers: number, volume: number): number {
  // Calculate earnings based on current rank achievements
  if (activePlayers >= 12 && volume >= 165600) return 14904; // Diamond
  if (activePlayers >= 8 && volume >= 110400) return 8832;   // Platinum
  if (activePlayers >= 6 && volume >= 69000) return 4830;    // Gold
  if (activePlayers >= 5 && volume >= 41400) return 2484;    // Silver
  if (activePlayers >= 5 && volume >= 13800) return 690;     // Bronze
  
  return 0; // Starter
}
