import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// This endpoint should be called daily to distribute unilevel commissions
// Based on VIP plan earnings: $138 x 10% = $13.8 monthly or $0.44 daily per account
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get current date for distribution
    const distributionDate = new Date().toISOString().split('T')[0];
    
    console.log(`🚀 Starting daily unilevel commission distribution for ${distributionDate}`);

    // Check if distribution has already been run for today
    const { data: existingDistributions, error: checkError } = await supabaseAdmin
      .from('unilevel_commissions')
      .select('id')
      .eq('distribution_date', distributionDate)
      .limit(1);

    if (checkError) {
      throw new Error(`Error checking existing distributions: ${checkError.message}`);
    }

    if (existingDistributions && existingDistributions.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Unilevel commissions have already been distributed for ${distributionDate}`,
        data: {
          date: distributionDate,
          alreadyProcessed: true
        }
      });
    }

    // Run the daily commission calculation
    const { data, error } = await supabaseAdmin
      .rpc('calculate_daily_unilevel_commissions', {
        distribution_date_param: distributionDate
      });

    if (error) {
      throw new Error(`Commission distribution error: ${error.message}`);
    }

    const result = data[0];
    
    // Log results
    console.log(`🎉 Daily unilevel commission distribution completed for ${distributionDate}:`);
    console.log(`   📊 Processed: ${result.processed_users} users`);
    console.log(`   ✅ Successful: ${result.successful_distributions} distributions`);
    console.log(`   ❌ Failed: ${result.failed_distributions} distributions`);
    console.log(`   💰 Total distributed: $${parseFloat(result.total_commissions_distributed).toFixed(4)}`);

    // Send notification or log to external service if needed
    if (result.failed_distributions > 0) {
      console.warn(`⚠️  ${result.failed_distributions} commission distributions failed. Check logs for details.`);
    }

    return NextResponse.json({
      success: true,
      message: `Daily unilevel commissions distributed for ${distributionDate}`,
      data: {
        date: distributionDate,
        processed_users: result.processed_users,
        successful_distributions: result.successful_distributions,
        failed_distributions: result.failed_distributions,
        total_commissions_distributed: parseFloat(result.total_commissions_distributed),
        commission_structure: {
          base_daily_earnings: 0.44,
          level_1_rate: 0.10,
          level_2_6_rate: 0.05,
          level_7_10_rate: 0.025,
          level_11_15_rate: 0.01
        }
      }
    });

  } catch (error) {
    console.error('❌ Critical error in daily unilevel commission distribution:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during daily commission distribution',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check the status of daily distributions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data: commissions, error } = await supabaseAdmin
      .from('unilevel_commissions')
      .select('*')
      .eq('distribution_date', date)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Calculate summary statistics
    const summary = {
      date,
      total_commissions: commissions?.length || 0,
      total_amount: commissions?.reduce((sum, c) => sum + parseFloat(c.daily_commission), 0) || 0,
      by_status: {
        pending: commissions?.filter(c => c.status === 'pending').length || 0,
        distributed: commissions?.filter(c => c.status === 'distributed').length || 0,
        failed: commissions?.filter(c => c.status === 'failed').length || 0
      },
      by_level: {} as any,
      by_plan_type: {
        VIP: commissions?.filter(c => c.plan_type === 'VIP').length || 0,
        Starter: commissions?.filter(c => c.plan_type === 'Starter').length || 0
      },
      unique_referrers: new Set(commissions?.map(c => c.referrer_email) || []).size,
      unique_referred: new Set(commissions?.map(c => c.referred_email) || []).size,
      last_processed: commissions?.[0]?.distributed_at || null
    };

    // Group by level
    commissions?.forEach(c => {
      const level = `level_${c.referrer_level}`;
      if (!summary.by_level[level]) {
        summary.by_level[level] = { count: 0, amount: 0, rate: 0 };
      }
      summary.by_level[level].count++;
      summary.by_level[level].amount += parseFloat(c.daily_commission);
      summary.by_level[level].rate = parseFloat(c.commission_rate);
    });

    return NextResponse.json({
      success: true,
      data: {
        summary,
        commissions: commissions || [],
        commission_structure: {
          base_calculation: "138 USD VIP plan × 10% = 13.8 USD monthly = 0.44 USD daily per account",
          level_rates: {
            "Level 1": "10% = 0.044 USD daily per VIP account",
            "Levels 2-6": "5% = 0.022 USD daily per VIP account",
            "Levels 7-10": "2.5% = 0.011 USD daily per VIP account",
            "Levels 11-15": "1% = 0.0044 USD daily per VIP account"
          },
          access_rules: {
            "VIP members": "Can earn commissions up to 15 levels",
            "Starter members": "Can earn commissions from level 1 only"
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching daily commission status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
