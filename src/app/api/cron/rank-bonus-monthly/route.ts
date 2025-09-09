import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// This endpoint should be called monthly (e.g., on the 1st of each month)
// It automatically distributes rank bonuses to all eligible users
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you might want to add authentication)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    
    console.log(`🚀 Starting monthly rank bonus distribution for ${currentMonth}`);

    // Check if distribution has already been run for this month
    const { data: existingDistributions, error: checkError } = await supabaseAdmin
      .from('rank_bonus_distributions')
      .select('id')
      .eq('distribution_month', currentMonth)
      .limit(1);

    if (checkError) {
      throw new Error(`Error checking existing distributions: ${checkError.message}`);
    }

    if (existingDistributions && existingDistributions.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Rank bonuses have already been distributed for ${currentMonth}`,
        data: {
          month: currentMonth,
          alreadyProcessed: true
        }
      });
    }

    // Get all users with active referrals (potential bonus recipients)
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
      month: currentMonth,
      processed: 0,
      successful: 0,
      failed: 0,
      totalBonusDistributed: 0,
      totalTicDistributed: 0,
      totalGicDistributed: 0,
      details: [] as any[],
      errors: [] as string[]
    };

    console.log(`📊 Processing ${uniqueReferrers.length} users with referrals`);

    // Process each user
    for (const userEmail of uniqueReferrers) {
      results.processed++;
      
      try {
        // Get user's referral count
        const { data: referralData, error: referralError } = await supabaseAdmin
          .from('referral_relationships')
          .select('*')
          .eq('referrer_email', userEmail)
          .eq('is_active', true);

        if (referralError) {
          throw new Error(`Error fetching referrals for ${userEmail}: ${referralError.message}`);
        }

        const totalReferrals = referralData?.length || 0;
        const userRank = getUserRank(totalReferrals);
        const bonusAmount = getRankBonusAmount(userRank);

        // Process using group volume rank bonus system with GIC peso pricing
        const { data, error } = await supabaseAdmin
          .rpc('process_rank_bonus_with_gic_pricing', {
            user_email_param: userEmail,
            distribution_month_param: currentMonth
          });

        if (error) {
          throw new Error(`Database error for ${userEmail}: ${error.message}`);
        }

        if (data && bonusAmount > 0) {
          results.successful++;
          results.totalBonusDistributed += bonusAmount;
          results.totalTicDistributed += bonusAmount / 2;
          results.totalGicDistributed += bonusAmount / 2;

          results.details.push({
            userEmail,
            rank: userRank,
            totalReferrals,
            bonusAmount,
            ticAmount: bonusAmount / 2,
            gicAmount: bonusAmount / 2,
            status: 'success'
          });

          console.log(`✅ Distributed $${bonusAmount} to ${userEmail} (${userRank} rank, ${totalReferrals} referrals)`);
        } else {
          results.details.push({
            userEmail,
            rank: userRank,
            totalReferrals,
            bonusAmount: 0,
            status: 'no_bonus',
            reason: 'Rank not eligible for bonus'
          });
        }
        
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? (error as Error).message : 'Unknown error';
        results.errors.push(`${userEmail}: ${errorMessage}`);
        
        results.details.push({
          userEmail,
          status: 'error',
          error: errorMessage
        });

        console.error(`❌ Failed to process ${userEmail}:`, error);
      }
    }

    // Log final results
    console.log(`🎉 Monthly distribution completed for ${currentMonth}:`);
    console.log(`   📈 Processed: ${results.processed} users`);
    console.log(`   ✅ Successful: ${results.successful} distributions`);
    console.log(`   ❌ Failed: ${results.failed} distributions`);
    console.log(`   💰 Total distributed: $${results.totalBonusDistributed.toLocaleString()}`);
    console.log(`   🪙 TIC tokens: ${results.totalTicDistributed.toLocaleString()}`);
    console.log(`   💎 GIC tokens: ${results.totalGicDistributed.toLocaleString()}`);

    // Send notification or log to external service if needed
    if (results.failed > 0) {
      console.warn(`⚠️  ${results.failed} distributions failed. Check logs for details.`);
    }

    return NextResponse.json({
      success: true,
      message: `Monthly rank bonus distribution completed for ${currentMonth}`,
      data: results
    });

  } catch (error) {
    console.error('❌ Critical error in monthly rank bonus distribution:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during monthly distribution',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check the status of monthly distributions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const { data: distributions, error } = await supabaseAdmin
      .from('rank_bonus_distributions')
      .select('*')
      .eq('distribution_month', month)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const summary = {
      month,
      total: distributions?.length || 0,
      completed: distributions?.filter(d => d.status === 'completed').length || 0,
      pending: distributions?.filter(d => d.status === 'pending').length || 0,
      failed: distributions?.filter(d => d.status === 'failed').length || 0,
      totalBonusAmount: distributions?.reduce((sum, d) => sum + parseFloat(d.bonus_amount), 0) || 0,
      totalTicAmount: distributions?.reduce((sum, d) => sum + parseFloat(d.tic_amount), 0) || 0,
      totalGicAmount: distributions?.reduce((sum, d) => sum + parseFloat(d.gic_amount), 0) || 0,
      lastProcessed: distributions?.[0]?.processed_at || null
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        distributions: distributions || []
      }
    });

  } catch (error) {
    console.error('Error fetching monthly distribution status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
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
