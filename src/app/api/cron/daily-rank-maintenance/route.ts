import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Daily cron job to check and record rank maintenance for all users
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized cron request - invalid secret');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Invalid cron secret'
      }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`🔍 Starting daily rank maintenance check for ${today}`);

    // Get all users who have referrals (potential rank holders)
    const { data: usersWithReferrals, error: usersError } = await supabaseAdmin
      .from('referral_relationships')
      .select('referrer_email')
      .eq('level_depth', 1)
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Error fetching users with referrals:', usersError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users with referrals',
        details: usersError.message
      }, { status: 500 });
    }

    // Get unique user emails
    const uniqueUsers = [...new Set(usersWithReferrals?.map(u => u.referrer_email) || [])];
    console.log(`📊 Found ${uniqueUsers.length} users with referrals to check`);

    if (uniqueUsers.length === 0) {
      console.log('✅ No users with referrals found');
      return NextResponse.json({
        success: true,
        message: 'No users with referrals to check',
        date: today,
        users_checked: 0,
        qualified_users: 0,
        maintenance_records: []
      });
    }

    let totalChecked = 0;
    let qualifiedUsers = 0;
    const maintenanceResults = [];

    // Check rank maintenance for each user
    for (const userEmail of uniqueUsers) {
      try {
        console.log(`🔍 Checking rank maintenance for: ${userEmail}`);

        // Call the database function to check daily rank maintenance
        const { data: isQualified, error: checkError } = await supabaseAdmin
          .rpc('check_daily_rank_maintenance', {
            user_email_param: userEmail,
            check_date_param: today
          });

        if (checkError) {
          console.error(`❌ Error checking maintenance for ${userEmail}:`, checkError);
          maintenanceResults.push({
            user_email: userEmail,
            status: 'error',
            error: checkError.message,
            is_qualified: false
          });
          continue;
        }

        totalChecked++;
        if (isQualified) {
          qualifiedUsers++;
        }

        // Get the maintenance record that was just created
        const { data: maintenanceRecord, error: recordError } = await supabaseAdmin
          .from('daily_rank_maintenance')
          .select('*')
          .eq('user_email', userEmail)
          .eq('check_date', today)
          .single();

        maintenanceResults.push({
          user_email: userEmail,
          status: 'success',
          is_qualified: isQualified,
          current_referrals: maintenanceRecord?.current_referrals || 0,
          required_referrals: maintenanceRecord?.required_referrals || 0,
          rank_maintained: maintenanceRecord?.rank_maintained || 'No Rank'
        });

        console.log(`✅ ${userEmail}: ${maintenanceRecord?.rank_maintained || 'No Rank'} (${maintenanceRecord?.current_referrals || 0}/${maintenanceRecord?.required_referrals || 0} referrals) - ${isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}`);

      } catch (error) {
        console.error(`❌ Error processing ${userEmail}:`, error);
        maintenanceResults.push({
          user_email: userEmail,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          is_qualified: false
        });
      }
    }

    // Summary statistics
    const rankCounts = maintenanceResults.reduce((acc: any, result) => {
      if (result.status === 'success' && result.is_qualified) {
        const rank = result.rank_maintained || 'No Rank';
        acc[rank] = (acc[rank] || 0) + 1;
      }
      return acc;
    }, {});

    const summary = `🎉 Daily rank maintenance check completed: ${totalChecked} users checked, ${qualifiedUsers} qualified`;
    console.log(summary);

    console.log('📊 Rank Distribution:');
    Object.entries(rankCounts).forEach(([rank, count]) => {
      console.log(`  ${rank}: ${count} users`);
    });

    return NextResponse.json({
      success: true,
      message: 'Daily rank maintenance check completed',
      date: today,
      statistics: {
        total_users_checked: totalChecked,
        qualified_users: qualifiedUsers,
        unqualified_users: totalChecked - qualifiedUsers,
        rank_distribution: rankCounts
      },
      maintenance_records: maintenanceResults,
      summary
    });

  } catch (error) {
    console.error('❌ Error in daily rank maintenance check:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check current rank maintenance status
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's maintenance records
    const { data: todayRecords, error: todayError } = await supabaseAdmin
      .from('daily_rank_maintenance')
      .select('*')
      .eq('check_date', today)
      .order('rank_maintained', { ascending: false });

    // Get maintenance summary for current month
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const { data: monthlyTracking, error: monthlyError } = await supabaseAdmin
      .from('rank_maintenance_tracking')
      .select('*')
      .eq('tracking_month', currentMonth)
      .order('maintenance_percentage', { ascending: false });

    if (todayError || monthlyError) {
      console.error('Error fetching maintenance status:', todayError || monthlyError);
      return NextResponse.json({
        error: 'Failed to fetch maintenance status'
      }, { status: 500 });
    }

    // Calculate statistics
    const totalChecked = todayRecords?.length || 0;
    const qualifiedToday = todayRecords?.filter(r => r.is_qualified).length || 0;
    
    const rankDistribution = todayRecords?.reduce((acc: any, record) => {
      if (record.is_qualified) {
        const rank = record.rank_maintained;
        acc[rank] = (acc[rank] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      date: today,
      current_month: currentMonth,
      daily_status: {
        total_users_checked: totalChecked,
        qualified_users: qualifiedToday,
        unqualified_users: totalChecked - qualifiedToday,
        rank_distribution: rankDistribution,
        records: todayRecords || []
      },
      monthly_tracking: {
        total_tracked: monthlyTracking?.length || 0,
        qualified_for_bonus: monthlyTracking?.filter(t => t.is_qualified).length || 0,
        records: monthlyTracking || []
      },
      maintenance_requirements: {
        minimum_maintenance_percentage: 80,
        explanation: 'Users must maintain their rank requirements for at least 80% of the month to qualify for bonuses',
        rank_requirements: {
          'Bronze': '5 direct referrals',
          'Silver': '10 direct referrals',
          'Gold': '15 direct referrals',
          'Platinum': '20 direct referrals',
          'Diamond': '25 direct referrals'
        }
      }
    });

  } catch (error) {
    console.error('Error checking rank maintenance status:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
