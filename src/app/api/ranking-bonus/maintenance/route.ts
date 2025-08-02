import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// GET - Get ranking maintenance status for authenticated user
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
    const monthsBack = parseInt(searchParams.get('months') || '6');

    // Get ranking maintenance status
    const { data: maintenanceStatus, error: statusError } = await supabaseAdmin
      .rpc('get_ranking_maintenance_status', {
        user_email_param: userEmail,
        months_back: monthsBack
      });

    if (statusError) {
      console.error('Error fetching ranking maintenance status:', statusError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ranking maintenance status' },
        { status: 500 }
      );
    }

    // Get current month qualification
    const { data: currentQualification, error: currentError } = await supabaseAdmin
      .rpc('check_monthly_ranking_qualification', {
        user_email_param: userEmail,
        check_month_param: new Date().toISOString().slice(0, 7) + '-01'
      });

    if (currentError) {
      console.error('Error checking current qualification:', currentError);
    }

    // Check eligibility for current month
    const { data: eligibility, error: eligibilityError } = await supabaseAdmin
      .rpc('is_eligible_for_bonus', {
        user_email_param: userEmail,
        check_month_param: new Date().toISOString().slice(0, 7) + '-01'
      });

    if (eligibilityError) {
      console.error('Error checking bonus eligibility:', eligibilityError);
    }

    // Calculate maintenance statistics
    const totalMonths = maintenanceStatus?.length || 0;
    const qualifiedMonths = maintenanceStatus?.filter((m: any) => m.qualifies_for_bonus).length || 0;
    const bonusesDistributed = maintenanceStatus?.filter((m: any) => m.bonus_distributed).length || 0;
    const totalBonusesEarned = maintenanceStatus?.reduce((sum: number, m: any) => sum + (m.bonus_distributed ? parseFloat(m.bonus_amount) : 0), 0) || 0;

    // Get rank consistency
    const ranks = maintenanceStatus?.map((m: any) => m.rank_achieved) || [];
    const uniqueRanks = [...new Set(ranks)];
    const currentRank = currentQualification?.[0]?.current_rank || 'No Rank';
    
    // Calculate rank stability (months at current rank)
    let rankStability = 0;
    if (maintenanceStatus && maintenanceStatus.length > 0) {
      for (let i = 0; i < maintenanceStatus.length; i++) {
        if (maintenanceStatus[i].rank_achieved === currentRank) {
          rankStability++;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        currentStatus: {
          currentRank: currentRank,
          qualifies: currentQualification?.[0]?.qualifies || false,
          directReferrals: currentQualification?.[0]?.direct_referrals || 0,
          maxLevel: currentQualification?.[0]?.max_level || 0,
          monthlyBonus: currentQualification?.[0]?.monthly_bonus || 0,
          missingRequirements: currentQualification?.[0]?.missing_requirements || [],
          eligibleForBonus: eligibility?.[0]?.eligible || false,
          eligibilityReason: eligibility?.[0]?.eligibility_reason || 'Unknown'
        },
        maintenanceHistory: maintenanceStatus || [],
        statistics: {
          totalMonthsTracked: totalMonths,
          qualifiedMonths: qualifiedMonths,
          qualificationRate: totalMonths > 0 ? ((qualifiedMonths / totalMonths) * 100).toFixed(1) : '0.0',
          bonusesDistributed: bonusesDistributed,
          totalBonusesEarned: totalBonusesEarned,
          rankStability: rankStability,
          uniqueRanksAchieved: uniqueRanks.length,
          ranksAchieved: uniqueRanks
        }
      }
    });

  } catch (error) {
    console.error('Error fetching ranking maintenance status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Force record qualification for current month (admin/testing function)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetUserEmail, qualificationMonth } = body;

    // Use target email if provided (admin function), otherwise use authenticated user
    const recordUserEmail = targetUserEmail || userEmail;
    const recordMonth = qualificationMonth || new Date().toISOString().slice(0, 7) + '-01';

    // Record monthly qualification
    const { data: recordResult, error: recordError } = await supabaseAdmin
      .rpc('record_monthly_qualification', {
        user_email_param: recordUserEmail,
        qualification_month_param: recordMonth
      });

    if (recordError) {
      console.error('Error recording monthly qualification:', recordError);
      return NextResponse.json(
        { success: false, error: 'Failed to record monthly qualification' },
        { status: 500 }
      );
    }

    // Get the recorded qualification
    const { data: qualification, error: qualError } = await supabaseAdmin
      .from('monthly_ranking_qualifications')
      .select('*')
      .eq('user_email', recordUserEmail)
      .eq('qualification_month', recordMonth)
      .single();

    if (qualError) {
      console.error('Error fetching recorded qualification:', qualError);
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly qualification recorded successfully',
      data: {
        userEmail: recordUserEmail,
        qualificationMonth: recordMonth,
        qualification: qualification
      }
    });

  } catch (error) {
    console.error('Error recording monthly qualification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
