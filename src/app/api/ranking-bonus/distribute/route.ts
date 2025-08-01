import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// POST - Distribute ranking bonuses to qualified users
export async function POST(request: NextRequest) {
  try {
    // Get current user from session (for admin/system calls)
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

    const body = await request.json();
    const { targetUserEmail, forceDistribution = false } = body;

    // If targetUserEmail is provided, distribute to specific user (admin function)
    // Otherwise, distribute to the authenticated user
    const distributionUserEmail = targetUserEmail || userEmail;

    // Check if user is eligible for bonus distribution (includes qualification maintenance)
    const { data: eligibility, error: eligibilityError } = await supabaseAdmin
      .rpc('is_eligible_for_bonus', {
        user_email_param: distributionUserEmail,
        check_month_param: new Date().toISOString().slice(0, 7) + '-01' // First day of current month
      });

    if (eligibilityError) {
      console.error('Error checking bonus eligibility:', eligibilityError);
      return NextResponse.json(
        { success: false, error: 'Failed to check bonus eligibility' },
        { status: 500 }
      );
    }

    const eligibilityData = eligibility[0];
    if (!eligibilityData.eligible && !forceDistribution) {
      return NextResponse.json({
        success: false,
        error: eligibilityData.eligibility_reason,
        data: {
          currentRank: eligibilityData.rank,
          bonusAmount: eligibilityData.bonus_amount,
          alreadyDistributed: eligibilityData.already_distributed,
          eligibilityReason: eligibilityData.eligibility_reason
        }
      });
    }

    // Generate unique transaction ID
    const transactionId = `rank_bonus_${eligibilityData.rank.toLowerCase()}_${Date.now()}`;

    // Distribute the ranking bonus (50% TIC + 50% GIC)
    const { data: distributionResult, error: distributionError } = await supabaseAdmin
      .rpc('distribute_ranking_bonus', {
        user_email_param: distributionUserEmail,
        total_bonus_param: eligibilityData.bonus_amount,
        rank_param: eligibilityData.rank,
        transaction_id_param: transactionId
      });

    if (distributionError) {
      console.error('Error distributing ranking bonus:', distributionError);
      return NextResponse.json(
        { success: false, error: 'Failed to distribute ranking bonus' },
        { status: 500 }
      );
    }

    // Mark bonus as distributed in the qualification system
    const { error: markError } = await supabaseAdmin
      .rpc('mark_bonus_distributed', {
        user_email_param: distributionUserEmail,
        qualification_month_param: new Date().toISOString().slice(0, 7) + '-01'
      });

    if (markError) {
      console.error('Error marking bonus as distributed:', markError);
      // Don't fail the request, but log the error
    }

    // Calculate token amounts
    const ticAmount = eligibilityData.bonus_amount / 2;
    const gicAmount = eligibilityData.bonus_amount / 2;

    return NextResponse.json({
      success: true,
      message: `Successfully distributed ${eligibilityData.rank} rank bonus`,
      data: {
        userEmail: distributionUserEmail,
        rank: eligibilityData.rank,
        totalBonus: eligibilityData.bonus_amount,
        ticAmount: ticAmount,
        gicAmount: gicAmount,
        transactionId: transactionId,
        eligibilityReason: eligibilityData.eligibility_reason
      }
    });

  } catch (error) {
    console.error('Error in ranking bonus distribution:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check ranking qualification for authenticated user
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

    // Check current month qualification and record it
    const { data: qualification, error: qualError } = await supabaseAdmin
      .rpc('check_monthly_ranking_qualification', {
        user_email_param: userEmail,
        check_month_param: new Date().toISOString().slice(0, 7) + '-01'
      });

    if (qualError) {
      console.error('Error checking monthly ranking qualification:', qualError);
      return NextResponse.json(
        { success: false, error: 'Failed to check ranking qualification' },
        { status: 500 }
      );
    }

    const qualData = qualification[0];

    // Record the qualification for this month
    const { error: recordError } = await supabaseAdmin
      .rpc('record_monthly_qualification', {
        user_email_param: userEmail,
        qualification_month_param: new Date().toISOString().slice(0, 7) + '-01'
      });

    if (recordError) {
      console.error('Error recording monthly qualification:', recordError);
      // Don't fail the request, but log the error
    }

    // Get ranking bonus history
    const { data: bonusHistory, error: historyError } = await supabaseAdmin
      .rpc('get_ranking_bonus_history', {
        user_email_param: userEmail,
        limit_param: 20
      });

    if (historyError) {
      console.error('Error fetching bonus history:', historyError);
    }

    return NextResponse.json({
      success: true,
      data: {
        qualification: {
          qualifies: qualData.qualifies,
          currentRank: qualData.current_rank,
          directReferrals: qualData.direct_referrals,
          maxLevel: qualData.max_level,
          monthlyBonus: qualData.monthly_bonus,
          ticAmount: qualData.monthly_bonus / 2,
          gicAmount: qualData.monthly_bonus / 2
        },
        bonusHistory: bonusHistory || []
      }
    });

  } catch (error) {
    console.error('Error checking ranking qualification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
