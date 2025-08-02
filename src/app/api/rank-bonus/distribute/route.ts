import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import NotificationService from '@/lib/services/notificationService';

// Rank bonus amounts (monthly)
const RANK_BONUSES = {
  'Bronze': 690,
  'Silver': 2484,
  'Gold': 4830,
  'Platinum': 8832,
  'Diamond': 14904
};

export async function POST(request: NextRequest) {
  try {
    const { month, userEmail } = await request.json();

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!month || !monthRegex.test(month)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid month format. Use YYYY-MM format.'
      }, { status: 400 });
    }

    // If userEmail is provided, process single user
    if (userEmail) {
      const result = await processSingleUserBonus(userEmail, month);
      return NextResponse.json(result);
    }

    // Otherwise, process all eligible users
    const result = await processAllUsersBonus(month);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in rank bonus distribution:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processSingleUserBonus(userEmail: string, month: string) {
  try {
    // Check if user exists and get referral count
    const { data: referralData, error: referralError } = await supabaseAdmin
      .from('referral_relationships')
      .select('*')
      .eq('referrer_email', userEmail)
      .eq('is_active', true);

    if (referralError) {
      throw new Error(`Error fetching referrals: ${referralError.message}`);
    }

    const totalReferrals = referralData?.length || 0;
    const userRank = getUserRank(totalReferrals);
    const bonusAmount = RANK_BONUSES[userRank as keyof typeof RANK_BONUSES] || 0;

    if (bonusAmount === 0) {
      return {
        success: false,
        message: `User ${userEmail} has rank ${userRank} with no bonus eligibility`,
        data: {
          userEmail,
          rank: userRank,
          totalReferrals,
          bonusAmount: 0
        }
      };
    }

    // Process the bonus using database function
    const { data, error } = await supabaseAdmin
      .rpc('process_user_rank_bonus', {
        user_email_param: userEmail,
        distribution_month_param: month
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Get the created distribution record
    const { data: distributionData, error: distError } = await supabaseAdmin
      .from('rank_bonus_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('distribution_month', month)
      .single();

    // Send notification to user
    try {
      const notificationService = new NotificationService();
      await notificationService.createNotification(
        userEmail,
        'rank_bonus',
        'Rank Bonus Received!',
        `Congratulations! You've received your ${userRank} rank bonus of $${bonusAmount.toLocaleString()} (${(bonusAmount/2).toLocaleString()} TIC + ${(bonusAmount/2).toLocaleString()} GIC tokens) for ${month}.`,
        {
          rank: userRank,
          bonusAmount,
          ticAmount: bonusAmount / 2,
          gicAmount: bonusAmount / 2,
          month,
          totalReferrals
        }
      );
    } catch (notificationError) {
      console.error('Failed to send rank bonus notification:', notificationError);
      // Don't fail the distribution if notification fails
    }

    return {
      success: true,
      message: `Rank bonus distributed successfully for ${userEmail}`,
      data: {
        userEmail,
        rank: userRank,
        totalReferrals,
        bonusAmount,
        ticAmount: bonusAmount / 2,
        gicAmount: bonusAmount / 2,
        month,
        distribution: distributionData
      }
    };

  } catch (error) {
    console.error(`Error processing bonus for ${userEmail}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: { userEmail, month }
    };
  }
}

async function processAllUsersBonus(month: string) {
  try {
    // Get all users with referrals (potential bonus recipients)
    const { data: usersWithReferrals, error: usersError } = await supabaseAdmin
      .from('referral_relationships')
      .select('referrer_email')
      .eq('is_active', true);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    // Get unique referrer emails
    const uniqueReferrers = Array.from(new Set(usersWithReferrals?.map(r => r.referrer_email) || []));

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      totalBonusDistributed: 0,
      totalTicDistributed: 0,
      totalGicDistributed: 0,
      details: [] as any[]
    };

    // Process each user
    for (const userEmail of uniqueReferrers) {
      results.processed++;
      
      try {
        const userResult = await processSingleUserBonus(userEmail, month);
        
        if (userResult.success) {
          results.successful++;
          results.totalBonusDistributed += userResult.data.bonusAmount || 0;
          results.totalTicDistributed += userResult.data.ticAmount || 0;
          results.totalGicDistributed += userResult.data.gicAmount || 0;
        } else {
          results.failed++;
        }
        
        results.details.push(userResult);
        
      } catch (error) {
        results.failed++;
        results.details.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: { userEmail, month }
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.processed} users. ${results.successful} successful, ${results.failed} failed.`,
      data: results
    };

  } catch (error) {
    console.error('Error processing all users bonus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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

// GET endpoint to check distribution status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const userEmail = searchParams.get('userEmail');

    if (!month) {
      return NextResponse.json({
        success: false,
        error: 'Month parameter is required'
      }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('rank_bonus_distributions')
      .select('*')
      .eq('distribution_month', month);

    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      summary: {
        total: data?.length || 0,
        completed: data?.filter(d => d.status === 'completed').length || 0,
        pending: data?.filter(d => d.status === 'pending').length || 0,
        failed: data?.filter(d => d.status === 'failed').length || 0,
        totalBonusAmount: data?.reduce((sum, d) => sum + parseFloat(d.bonus_amount), 0) || 0,
        totalTicAmount: data?.reduce((sum, d) => sum + parseFloat(d.tic_amount), 0) || 0,
        totalGicAmount: data?.reduce((sum, d) => sum + parseFloat(d.gic_amount), 0) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching distribution status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
