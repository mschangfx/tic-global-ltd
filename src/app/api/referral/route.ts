import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Commission structure based on your requirements - Complete 15 Level Structure
const COMMISSION_STRUCTURE = {
  1: { rate: 10, description: "10% x $0.44=$0.044 daily bonus" },
  2: { rate: 5, description: "5% x $0.44=$0.022 daily bonus" },
  3: { rate: 5, description: "5% x $0.44=$0.022 daily bonus" },
  4: { rate: 5, description: "5% x $0.44=$0.022 daily bonus" },
  5: { rate: 5, description: "5% x $0.44=$0.022 daily bonus" },
  6: { rate: 5, description: "5% x $0.44=$0.022 daily bonus" },
  7: { rate: 2.5, description: "2.5% x $0.44=$0.011 daily bonus" },
  8: { rate: 2.5, description: "2.5% x $0.44=$0.011 daily bonus" },
  9: { rate: 2.5, description: "2.5% x $0.44=$0.011 daily bonus" },
  10: { rate: 2.5, description: "2.5% x $0.44=$0.011 daily bonus" },
  11: { rate: 1, description: "1% x $0.44=$0.0044 daily bonus" },
  12: { rate: 1, description: "1% x $0.44=$0.0044 daily bonus" },
  13: { rate: 1, description: "1% x $0.44=$0.0044 daily bonus" },
  14: { rate: 1, description: "1% x $0.44=$0.0044 daily bonus" },
  15: { rate: 1, description: "1% x $0.44=$0.0044 daily bonus" }
};

// Rank bonuses based on direct referrals + 10th unilevel qualification
const RANK_BONUSES = {
  bronze: {
    rank: "Bronze",
    directReferrals: 5,
    unilevelRequired: 10,
    bonus: 690,
    description: "Bronze: 5 direct referrals + 10th unilevel = $690/month (50% GIC + 50% TIC)",
    calculation: "2 Group A&B: $13,800 × 5% = $690/2 = $345 GIC + $345 TIC"
  },
  silver: {
    rank: "Silver",
    directReferrals: 5,
    unilevelRequired: 10,
    bonus: 2484,
    description: "Silver: 5 direct referrals + 10th unilevel = $2,484/month (50% GIC + 50% TIC)",
    calculation: "3 Group A,B&C: WL=$13,800 + PL=$27,600 = $41,400 × 6% = $2,484/2 = $1,242 GIC + $1,242 TIC",
    groupSystem: "3 Group (WL vs PL)"
  },
  gold: {
    rank: "Gold",
    directReferrals: 6, // 6 active players required
    unilevelRequired: 10,
    bonus: 4830,
    description: "Gold: 6 active players + 10th unilevel = $4,830/month (50% GIC + 50% TIC)",
    calculation: "3 Group A,B&C: WL=$23,000 + PL=$46,000 = $69,000 × 7% = $4,830/2 = $2,415 GIC + $2,415 TIC",
    groupSystem: "3 Group (WL vs PL)",
    requirements: {
      activeDirectReferrals: 6,
      groupStructure: "3 Group A,B&C",
      weakLine: "$23,000 (Group A)",
      personalLine: "$46,000 (Groups B+C+D+E)",
      totalVolume: "$69,000",
      percentage: "7%",
      monthlyBonus: "$4,830",
      tokenDistribution: {
        gic: "$2,415",
        tic: "2,415 USD"
      }
    }
  },
  platinum: {
    rank: "Platinum",
    directReferrals: 8, // 8 active players required
    unilevelRequired: 10,
    bonus: 8832,
    description: "Platinum: 8 active players + 10th unilevel = $8,832/month (50% GIC + 50% TIC)",
    calculation: "4 Group A,B,C&D: WL=$27,600 + PL=$82,800 = $110,400 × 8% = $8,832/2 = $4,416 GIC + $4,416 TIC",
    groupSystem: "4 Group A,B,C&D",
    requirements: {
      activeDirectReferrals: 8,
      groupStructure: "4 Group A,B,C&D",
      weakLine: "$27,600 (Group A)",
      personalLine: "$82,800 (Groups B+C+D+E)",
      totalVolume: "$110,400",
      percentage: "8%",
      monthlyBonus: "$8,832",
      tokenDistribution: {
        gic: "$4,416",
        tic: "$4,416"
      }
    }
  },
  diamond: {
    rank: "Diamond",
    directReferrals: 12, // 12 active players required
    unilevelRequired: 10,
    bonus: 14904,
    description: "Diamond: 12 active players + 10th unilevel = 14,904 USD/month (50% GIC + 50% TIC)",
    calculation: "5 Group A,B,C,D&E: PL=33,120 + WL=131,880 = 165,000 × 9% = 14,904/2 = 7,452 GIC + 7,452 TIC",
    groupSystem: "5 Group A,B,C,D&E",
    requirements: {
      activeDirectReferrals: 12,
      groupStructure: "5 Group A,B,C,D&E",
      personalLine: "33,120 USD (Group A)",
      weakLine: "131,880 USD (Groups B+C+D+E)",
      totalVolume: "165,000 USD",
      percentage: "9%",
      monthlyBonus: "14,904 USD",
      tokenDistribution: {
        gic: "7,452 USD",
        tic: "7,452 USD"
      }
    }
  }
};

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Get authenticated user email from session
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    switch (action) {
      case 'get-referral-data':
        return await getReferralData(supabase, userEmail);
      case 'get-referral-stats':
        return await getReferralStats(supabase, userEmail);
      case 'get-commission-structure':
        return await getCommissionStructure();
      case 'create-referral-code':
        const { referralCode, referralLink } = body;
        return await createReferralCode(supabase, userEmail, referralCode, referralLink);
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function getReferralData(supabase: any, userEmail: string) {
  try {
    // Check if user already has a referral code
    const { data: existingReferral, error: fetchError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let referralData = existingReferral;

    // If no referral data exists, create it
    if (!existingReferral) {
      const referralCode = generateReferralCode();
      const referralLink = `https://ticglobal.com/join?ref=${referralCode}`;

      const { data: newReferral, error: insertError } = await supabase
        .from('user_referral_codes')
        .insert({
          user_email: userEmail,
          referral_code: referralCode,
          referral_link: referralLink,
          total_referrals: 0,
          total_earnings: 0
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      referralData = newReferral;
    }

    return NextResponse.json({
      success: true,
      data: {
        referralCode: referralData.referral_code,
        referralLink: referralData.referral_link,
        totalReferrals: referralData.total_referrals || 0,
        totalEarnings: referralData.total_earnings || 0,
        createdAt: referralData.created_at
      }
    });

  } catch (error) {
    console.error('Error getting referral data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get referral data'
    }, { status: 500 });
  }
}

async function getReferralStats(supabase: any, userEmail: string) {
  try {
    // Get referral relationships
    const { data: relationships, error: relError } = await supabase
      .from('referral_relationships')
      .select('*')
      .eq('referrer_email', userEmail)
      .eq('is_active', true);

    if (relError) {
      throw relError;
    }

    // Get commission earnings
    const { data: commissions, error: commError } = await supabase
      .from('referral_commissions')
      .select('*')
      .eq('earner_email', userEmail);

    if (commError) {
      throw commError;
    }

    // Calculate stats
    const totalReferrals = relationships?.length || 0;
    const directReferrals = relationships?.filter((r: any) => r.level_depth === 1).length || 0;
    const totalEarnings = commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount), 0) || 0;
    const monthlyEarnings = commissions?.filter((c: any) => {
      const commissionDate = new Date(c.created_at);
      const now = new Date();
      return commissionDate.getMonth() === now.getMonth() &&
             commissionDate.getFullYear() === now.getFullYear();
    }).reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount), 0) || 0;

    // Determine rank based on direct referrals + 10th unilevel qualification
    const maxLevel = relationships?.length > 0 ? Math.max(...relationships.map((r: any) => r.level)) : 0;
    let currentLevel = maxLevel;
    let rankKey = 'none';

    // Must reach 10th unilevel to qualify for any ranking bonus
    const hasUnilevelQualification = maxLevel >= 10;

    if (hasUnilevelQualification) {
      // Determine rank based on number of direct referrals and additional criteria
      if (directReferrals >= 12) {
        rankKey = 'diamond'; // Diamond: 12+ active players (5 Group A,B,C,D&E system)
      } else if (directReferrals >= 8) {
        rankKey = 'platinum'; // Platinum: 8 active players (4 Group A,B,C&D system)
      } else if (directReferrals >= 6) {
        rankKey = 'gold'; // Gold: 6 active players (3 Group A,B&C system)
      } else if (directReferrals >= 5) {
        // For 5 direct referrals, need to determine Bronze vs Silver
        // This would require additional business logic to differentiate
        // For now, defaulting to Bronze (2 Group system)
        // Silver (3 Group system) might require additional qualification
        rankKey = 'bronze'; // Bronze: 5 direct referrals (2 Group system)
      }
    }

    const rankInfo = RANK_BONUSES[rankKey as keyof typeof RANK_BONUSES] || {
      rank: "No Rank",
      directReferrals: 0,
      unilevelRequired: 10,
      bonus: 0,
      description: hasUnilevelQualification ?
        `Need ${5 - directReferrals} more direct referrals for Bronze rank` :
        `Need to reach 10th unilevel (currently level ${maxLevel}) + 5 direct referrals for Bronze rank`
    };

    return NextResponse.json({
      success: true,
      data: {
        totalReferrals,
        directReferrals,
        totalEarnings: totalEarnings.toFixed(2),
        monthlyEarnings: monthlyEarnings.toFixed(2),
        currentLevel,
        maxLevel,
        hasUnilevelQualification,
        rankTitle: rankInfo?.rank || 'No Rank',
        monthlyBonus: rankInfo?.bonus || 0,
        rankDescription: rankInfo?.description || '',
        relationships: relationships || [],
        recentCommissions: commissions?.slice(-10) || []
      }
    });

  } catch (error) {
    console.error('Error getting referral stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get referral stats'
    }, { status: 500 });
  }
}

async function createReferralCode(supabase: any, userEmail: string, referralCode: string, referralLink: string) {
  try {
    const { data: newReferral, error: insertError } = await supabase
      .from('user_referral_codes')
      .upsert({
        user_email: userEmail,
        referral_code: referralCode,
        referral_link: referralLink,
        total_referrals: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: {
        referralCode: newReferral.referral_code,
        referralLink: newReferral.referral_link,
        totalReferrals: newReferral.total_referrals || 0,
        totalEarnings: newReferral.total_earnings || 0,
        createdAt: newReferral.created_at
      }
    });

  } catch (error) {
    console.error('Error creating referral code:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create referral code'
    }, { status: 500 });
  }
}

async function getCommissionStructure() {
  return NextResponse.json({
    success: true,
    data: {
      commissionRates: COMMISSION_STRUCTURE,
      rankBonuses: RANK_BONUSES,
      baseEarnings: 0.44,
      description: "Commission rates based on VIP plan earnings of $0.44 daily per account"
    }
  });
}
