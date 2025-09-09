import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// OFFICIAL TOKEN ALLOCATIONS
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year = 18.904109589 TIC per day
  'starter': 500    // Starter Plan: 500 TIC tokens per year = 1.369863014 TIC per day
} as const;

// Calculate exact daily token amount
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return yearlyAmount / 365; // VIP: 18.904109589, Starter: 1.369863014
};

// EMERGENCY COMPREHENSIVE FIX: Clean ALL duplicates and wrong amounts
export async function POST(request: NextRequest) {
  try {
    console.log('🚨 EMERGENCY COMPREHENSIVE FIX: Cleaning all distribution issues...');
    
    const currentTime = new Date().toISOString();
    
    // Get date range to fix (last 60 days to be thorough)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Analyzing distributions from ${startDateStr} to ${endDateStr}`);

    // Step 1: Get ALL distributions in date range
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

    console.log(`🔍 Found ${allDistributions?.length || 0} total distributions to analyze`);

    // Step 2: Analyze and categorize issues
    const distributionsByDateUser: { [key: string]: any[] } = {};
    const wrongAmounts: any[] = [];
    const duplicates: any[] = [];
    const correctDistributions: any[] = [];

    (allDistributions || []).forEach(dist => {
      const key = `${dist.distribution_date}_${dist.user_email}`;
      
      if (!distributionsByDateUser[key]) {
        distributionsByDateUser[key] = [];
      }
      distributionsByDateUser[key].push(dist);
      
      // Check for wrong amounts
      const expectedAmount = getDailyTokenAmount(dist.plan_id);
      const actualAmount = parseFloat(dist.token_amount);
      
      // Allow 1% tolerance for rounding
      const tolerance = expectedAmount * 0.01;
      const isWrongAmount = Math.abs(actualAmount - expectedAmount) > tolerance;
      
      if (isWrongAmount || actualAmount > 100) {
        wrongAmounts.push(dist);
      }
    });

    // Find duplicates (more than 1 distribution per user per date)
    Object.keys(distributionsByDateUser).forEach(key => {
      const distributions = distributionsByDateUser[key];
      if (distributions.length > 1) {
        // Keep the one with correct amount if exists, otherwise keep the first
        const correctOne = distributions.find(d => {
          const expectedAmount = getDailyTokenAmount(d.plan_id);
          const actualAmount = parseFloat(d.token_amount);
          const tolerance = expectedAmount * 0.01;
          return Math.abs(actualAmount - expectedAmount) <= tolerance;
        });
        
        if (correctOne) {
          // Mark others as duplicates
          duplicates.push(...distributions.filter(d => d.id !== correctOne.id));
          correctDistributions.push(correctOne);
        } else {
          // All are wrong, keep the first and mark others as duplicates
          duplicates.push(...distributions.slice(1));
          wrongAmounts.push(distributions[0]);
        }
      } else {
        // Single distribution - check if it's correct
        const dist = distributions[0];
        const expectedAmount = getDailyTokenAmount(dist.plan_id);
        const actualAmount = parseFloat(dist.token_amount);
        const tolerance = expectedAmount * 0.01;
        
        if (Math.abs(actualAmount - expectedAmount) <= tolerance) {
          correctDistributions.push(dist);
        }
      }
    });

    console.log(`📊 Analysis Results:`);
    console.log(`   - Wrong amounts: ${wrongAmounts.length}`);
    console.log(`   - Duplicates: ${duplicates.length}`);
    console.log(`   - Correct distributions: ${correctDistributions.length}`);

    // Step 3: Delete wrong amounts and duplicates
    const toDelete = [...wrongAmounts, ...duplicates];
    let deletedCount = 0;
    
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(d => d.id);
      
      console.log(`🗑️ Deleting ${toDelete.length} problematic distributions...`);
      
      const { error: deleteError } = await supabaseAdmin
        .from('token_distributions')
        .delete()
        .in('id', deleteIds);

      if (deleteError) {
        console.error('❌ Error deleting distributions:', deleteError);
        throw new Error(`Failed to delete distributions: ${deleteError.message}`);
      } else {
        deletedCount = toDelete.length;
        console.log(`✅ Deleted ${deletedCount} problematic distributions`);
      }
    }

    // Step 4: Get all active subscriptions to recreate missing distributions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', currentTime);

    if (subsError) {
      throw new Error(`Failed to fetch active subscriptions: ${subsError.message}`);
    }

    console.log(`👥 Found ${activeSubscriptions?.length || 0} active subscriptions`);

    // Step 5: Recreate correct distributions for recent dates (last 7 days)
    const recentStartDate = new Date();
    recentStartDate.setDate(recentStartDate.getDate() - 7);
    const recentStartDateStr = recentStartDate.toISOString().split('T')[0];
    
    const datesToFix: string[] = [];
    for (let d = new Date(recentStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      datesToFix.push(d.toISOString().split('T')[0]);
    }

    console.log(`📅 Recreating distributions for dates: ${datesToFix.join(', ')}`);

    let recreatedCount = 0;
    const recreationResults: any[] = [];

    for (const dateStr of datesToFix) {
      console.log(`🔄 Processing date: ${dateStr}`);
      
      // Group subscriptions by user
      const subscriptionsByUser: { [email: string]: any[] } = {};
      (activeSubscriptions || []).forEach(sub => {
        if (!subscriptionsByUser[sub.user_email]) {
          subscriptionsByUser[sub.user_email] = [];
        }
        subscriptionsByUser[sub.user_email].push(sub);
      });

      for (const userEmail of Object.keys(subscriptionsByUser)) {
        const userSubscriptions = subscriptionsByUser[userEmail];
        
        // Check if user already has correct distribution for this date
        const existingCorrect = correctDistributions.find(d => 
          d.user_email === userEmail && d.distribution_date === dateStr
        );
        
        if (existingCorrect) {
          console.log(`✅ User ${userEmail} already has correct distribution for ${dateStr}`);
          continue;
        }

        // Calculate total daily tokens for user
        let totalDailyTokens = 0;
        const planNames: string[] = [];

        userSubscriptions.forEach(sub => {
          const dailyTokens = getDailyTokenAmount(sub.plan_id);
          if (dailyTokens > 0) {
            totalDailyTokens += dailyTokens;
            if (!planNames.includes(sub.plan_name)) {
              planNames.push(sub.plan_name);
            }
          }
        });

        if (totalDailyTokens <= 0) {
          continue;
        }

        // Create correct distribution
        const primarySubscription = userSubscriptions[0];
        const distributionTime = new Date(`${dateStr}T${8 + Math.floor(Math.random() * 4)}:${Math.floor(Math.random() * 60)}:00.000Z`);

        const { data: newDistribution, error: createError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: userEmail,
            subscription_id: primarySubscription.id,
            plan_id: primarySubscription.plan_id,
            plan_name: planNames.length > 1 ? planNames.join(' + ') : planNames[0],
            token_amount: totalDailyTokens,
            distribution_date: dateStr,
            status: 'completed',
            created_at: distributionTime.toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creating distribution for ${userEmail} on ${dateStr}:`, createError);
        } else {
          recreatedCount++;
          console.log(`✅ Created correct distribution for ${userEmail} on ${dateStr}: ${totalDailyTokens.toFixed(4)} TIC`);
          
          recreationResults.push({
            user_email: userEmail,
            date: dateStr,
            amount: totalDailyTokens,
            plans: planNames.join(' + '),
            distribution_id: newDistribution.id
          });
        }
      }
    }

    console.log('🎉 EMERGENCY FIX COMPLETED!');

    return NextResponse.json({
      success: true,
      message: `Emergency fix completed - cleaned duplicates and wrong amounts`,
      timestamp: currentTime,
      date_range: {
        analyzed_from: startDateStr,
        analyzed_to: endDateStr,
        recreated_from: recentStartDateStr,
        recreated_to: endDateStr
      },
      summary: {
        total_distributions_analyzed: allDistributions?.length || 0,
        wrong_amounts_found: wrongAmounts.length,
        duplicates_found: duplicates.length,
        correct_distributions_kept: correctDistributions.length,
        total_deleted: deletedCount,
        distributions_recreated: recreatedCount,
        active_subscriptions: activeSubscriptions?.length || 0
      },
      token_allocations: {
        vip_daily: getDailyTokenAmount('vip'),
        starter_daily: getDailyTokenAmount('starter'),
        vip_yearly: TOKEN_ALLOCATIONS.vip,
        starter_yearly: TOKEN_ALLOCATIONS.starter
      },
      sample_recreated: recreationResults.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Emergency fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check current distribution status
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's distributions
    const { data: todayDistributions, error } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('distribution_date', today)
      .order('user_email', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch distributions: ${error.message}`);
    }

    // Analyze today's distributions
    const distributionsByUser: { [email: string]: any[] } = {};
    const wrongAmounts: any[] = [];
    const duplicates: any[] = [];

    (todayDistributions || []).forEach(dist => {
      if (!distributionsByUser[dist.user_email]) {
        distributionsByUser[dist.user_email] = [];
      }
      distributionsByUser[dist.user_email].push(dist);

      // Check for wrong amounts
      const expectedAmount = getDailyTokenAmount(dist.plan_id);
      const actualAmount = parseFloat(dist.token_amount);
      const tolerance = expectedAmount * 0.01;
      
      if (Math.abs(actualAmount - expectedAmount) > tolerance || actualAmount > 100) {
        wrongAmounts.push(dist);
      }
    });

    // Find duplicates
    Object.keys(distributionsByUser).forEach(userEmail => {
      const userDistributions = distributionsByUser[userEmail];
      if (userDistributions.length > 1) {
        duplicates.push(...userDistributions.slice(1));
      }
    });

    return NextResponse.json({
      success: true,
      date: today,
      timestamp: new Date().toISOString(),
      analysis: {
        total_distributions: todayDistributions?.length || 0,
        unique_users: Object.keys(distributionsByUser).length,
        wrong_amounts: wrongAmounts.length,
        duplicates: duplicates.length,
        needs_fix: wrongAmounts.length > 0 || duplicates.length > 0
      },
      token_allocations: {
        vip_daily: getDailyTokenAmount('vip'),
        starter_daily: getDailyTokenAmount('starter')
      },
      sample_issues: {
        wrong_amounts: wrongAmounts.slice(0, 5),
        duplicates: duplicates.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
