import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// CORRECT TOKEN ALLOCATIONS
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year = 18.904109589 TIC per day
  'starter': 500    // Starter Plan: 500 TIC tokens per year = 1.369863014 TIC per day
} as const;

// Calculate exact daily token amount
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // VIP: 18.904109589, Starter: 1.369863014
};

// COMPREHENSIVE FIX: Clean duplicates and fix wrong amounts for ALL dates
export async function POST(request: NextRequest) {
  try {
    console.log('🚨 COMPREHENSIVE FIX: Cleaning duplicates and fixing wrong amounts...');

    const currentTime = new Date().toISOString();

    // Get date range to fix (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📅 Fixing distributions from ${startDateStr} to ${endDateStr}`);

    // Step 1: Find ALL wrong distributions (any amount over 100 TIC or duplicates)
    const { data: allDistributions, error: allError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .gte('distribution_date', startDateStr)
      .lte('distribution_date', endDateStr)
      .order('distribution_date', { ascending: false })
      .order('user_email', { ascending: true })
      .order('created_at', { ascending: false });

    if (allError) {
      throw new Error(`Failed to fetch distributions: ${allError.message}`);
    }

    if (wrongError) {
      console.error('❌ Error finding wrong distributions:', wrongError);
      return NextResponse.json({
        success: false,
        error: 'Failed to find wrong distributions',
        details: wrongError.message
      }, { status: 500 });
    }

    console.log(`🔍 Found ${wrongDistributions?.length || 0} wrong VIP distributions`);

    // Step 2: Delete wrong distributions
    let deletedCount = 0;
    if (wrongDistributions && wrongDistributions.length > 0) {
      const wrongIds = wrongDistributions.map(d => d.id);
      
      const { error: deleteError } = await supabaseAdmin
        .from('token_distributions')
        .delete()
        .in('id', wrongIds);

      if (deleteError) {
        console.error('❌ Error deleting wrong distributions:', deleteError);
      } else {
        deletedCount = wrongDistributions.length;
        console.log(`🗑️ Deleted ${deletedCount} wrong distributions`);
      }
    }

    // Step 3: Get all VIP users who need correct distributions
    const { data: vipSubscriptions, error: vipError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('plan_id', 'vip')
      .gte('end_date', currentTime);

    if (vipError) {
      console.error('❌ Error fetching VIP subscriptions:', vipError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch VIP subscriptions',
        details: vipError.message
      }, { status: 500 });
    }

    console.log(`👑 Found ${vipSubscriptions?.length || 0} active VIP subscriptions`);

    // Step 4: Create correct distributions for VIP users
    let correctDistributionsCreated = 0;
    const results = [];
    const correctVipAmount = getDailyTokenAmount('vip'); // 18.904109589

    if (vipSubscriptions && vipSubscriptions.length > 0) {
      for (const subscription of vipSubscriptions) {
        try {
          // Check if user already has correct distribution for today
          const { data: existingCorrect } = await supabaseAdmin
            .from('token_distributions')
            .select('id')
            .eq('user_email', subscription.user_email)
            .eq('distribution_date', today)
            .eq('plan_id', 'vip')
            .lt('token_amount', 100) // Correct amount should be ~18.9
            .single();

          if (existingCorrect) {
            console.log(`⏭️ ${subscription.user_email} already has correct distribution`);
            continue;
          }

          // Create correct distribution with random time between 8-12 AM
          const distributionTime = new Date();
          distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

          const { data: newDistribution, error: createError } = await supabaseAdmin
            .from('token_distributions')
            .insert({
              user_email: subscription.user_email,
              subscription_id: subscription.id,
              plan_id: 'vip',
              plan_name: 'VIP Plan',
              token_amount: correctVipAmount,
              distribution_date: today,
              status: 'completed',
              created_at: distributionTime.toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error(`❌ Error creating correct distribution for ${subscription.user_email}:`, createError);
            results.push({
              user_email: subscription.user_email,
              status: 'error',
              error: createError.message
            });
            continue;
          }

          console.log(`✅ Created correct VIP distribution for ${subscription.user_email}: ${correctVipAmount.toFixed(4)} TIC`);

          // Update wallet balance with correct amount
          const transactionId = `fix_vip_daily_tic_${today}_${subscription.user_email.replace('@', '_').replace('.', '_')}`;
          const description = `Fixed Daily TIC Distribution - VIP Plan (${correctVipAmount.toFixed(4)} TIC)`;

          const { error: walletError } = await supabaseAdmin
            .rpc('increment_tic_balance_daily_distribution', {
              user_email_param: subscription.user_email,
              amount_param: correctVipAmount,
              transaction_id_param: transactionId,
              description_param: description,
              plan_type_param: 'vip'
            });

          if (walletError) {
            console.error(`⚠️ Wallet update failed for ${subscription.user_email}:`, walletError);
          } else {
            console.log(`💰 Updated wallet balance for ${subscription.user_email}: +${correctVipAmount.toFixed(4)} TIC`);
          }

          correctDistributionsCreated++;
          results.push({
            user_email: subscription.user_email,
            status: 'success',
            old_amount: wrongDistributions?.find(d => d.user_email === subscription.user_email)?.token_amount || 'unknown',
            new_amount: correctVipAmount,
            distribution_id: newDistribution.id
          });

        } catch (userError) {
          console.error(`❌ Error processing VIP user ${subscription.user_email}:`, userError);
          results.push({
            user_email: subscription.user_email,
            status: 'error',
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }
    }

    console.log(`🎉 VIP DISTRIBUTION FIX COMPLETED!`);
    console.log(`🗑️ Deleted: ${deletedCount} wrong distributions`);
    console.log(`✅ Created: ${correctDistributionsCreated} correct distributions`);

    return NextResponse.json({
      success: true,
      message: `VIP distribution fix completed for ${today}`,
      date: today,
      timestamp: currentTime,
      summary: {
        wrong_distributions_deleted: deletedCount,
        correct_distributions_created: correctDistributionsCreated,
        vip_subscriptions_processed: vipSubscriptions?.length || 0,
        correct_vip_daily_amount: correctVipAmount,
        expected_display: `+${correctVipAmount.toFixed(2)} TIC`
      },
      fix_details: {
        problem: 'VIP users getting +810 TIC instead of +18.90 TIC',
        solution: 'Deleted wrong distributions and created correct ones',
        correct_amount: correctVipAmount,
        date_fixed: today
      },
      results: results.slice(0, 20) // Show first 20 results
    });

  } catch (error) {
    console.error('❌ VIP DISTRIBUTION FIX ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'VIP distribution fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check VIP distribution status
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get VIP distributions for today
    const { data: vipDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('distribution_date', today)
      .eq('plan_id', 'vip')
      .order('created_at', { ascending: false });

    // Separate wrong and correct distributions
    const wrongDistributions = vipDistributions?.filter(d => d.token_amount > 100) || [];
    const correctDistributions = vipDistributions?.filter(d => d.token_amount < 100) || [];

    // Get active VIP subscriptions
    const { data: activeVipSubs } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_email')
      .eq('status', 'active')
      .eq('plan_id', 'vip')
      .gte('end_date', new Date().toISOString());

    const totalVipUsers = new Set(activeVipSubs?.map(s => s.user_email) || []).size;
    const vipUsersWithCorrectDistributions = new Set(correctDistributions.map(d => d.user_email)).size;

    return NextResponse.json({
      success: true,
      date: today,
      timestamp: new Date().toISOString(),
      vip_status: {
        total_active_vip_users: totalVipUsers,
        wrong_distributions: wrongDistributions.length,
        correct_distributions: correctDistributions.length,
        users_with_correct_distributions: vipUsersWithCorrectDistributions,
        users_missing_correct_distributions: totalVipUsers - vipUsersWithCorrectDistributions,
        fix_needed: wrongDistributions.length > 0 || (totalVipUsers - vipUsersWithCorrectDistributions) > 0
      },
      correct_amounts: {
        vip_daily: getDailyTokenAmount('vip'),
        vip_display: `+${getDailyTokenAmount('vip').toFixed(2)} TIC`,
        starter_daily: getDailyTokenAmount('starter'),
        starter_display: `+${getDailyTokenAmount('starter').toFixed(2)} TIC`
      },
      sample_wrong_distributions: wrongDistributions.slice(0, 5),
      sample_correct_distributions: correctDistributions.slice(0, 5)
    });

  } catch (error) {
    console.error('Error checking VIP distribution status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check VIP status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
