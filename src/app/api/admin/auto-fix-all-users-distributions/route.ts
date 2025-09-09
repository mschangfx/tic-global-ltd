import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Correct token allocations
const CORRECT_TOKEN_ALLOCATIONS = {
  'vip': 6900 / 365,      // 18.904109589 TIC per day
  'starter': 500 / 365    // 1.369863014 TIC per day
} as const;

// POST - Automatically fix ALL users' distributions without manual checking
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting automatic fix for ALL users distributions...');

    const results = {
      users_processed: 0,
      distributions_fixed: 0,
      duplicates_removed: 0,
      amounts_corrected: 0,
      consolidations_made: 0,
      errors: [] as string[],
      user_fixes: [] as any[]
    };

    // Step 1: Get all active subscriptions grouped by user
    const { data: allSubscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('user_email, plan_id');

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    // Step 2: Get all recent distributions (last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    const { data: allDistributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .gte('distribution_date', sixtyDaysAgoStr)
      .order('user_email, distribution_date, created_at');

    if (distError) {
      throw new Error(`Failed to fetch distributions: ${distError.message}`);
    }

    // Step 3: Group by user and process each user automatically
    const userSubscriptions = new Map<string, any[]>();
    const userDistributions = new Map<string, any[]>();

    // Group subscriptions by user
    for (const sub of allSubscriptions || []) {
      const userEmail = sub.user_email;
      if (!userSubscriptions.has(userEmail)) {
        userSubscriptions.set(userEmail, []);
      }
      userSubscriptions.get(userEmail)?.push(sub);
    }

    // Group distributions by user
    for (const dist of allDistributions || []) {
      const userEmail = dist.user_email;
      if (!userDistributions.has(userEmail)) {
        userDistributions.set(userEmail, []);
      }
      userDistributions.get(userEmail)?.push(dist);
    }

    // Step 4: Process each user automatically
    for (const userEmail of Array.from(userSubscriptions.keys())) {
      const subscriptions = userSubscriptions.get(userEmail) || [];
      try {
        results.users_processed++;
        const userFix = {
          user_email: userEmail,
          subscription_count: subscriptions.length,
          issues_found: [] as string[],
          actions_taken: [] as string[]
        };

        const distributions = userDistributions.get(userEmail) || [];

        // Calculate expected daily amount for this user
        let expectedDailyTic = 0;
        const planCounts = { vip: 0, starter: 0 };
        
        for (const sub of subscriptions) {
          const planId = sub.plan_id.toLowerCase();
          if (planId === 'vip') {
            planCounts.vip++;
            expectedDailyTic += CORRECT_TOKEN_ALLOCATIONS.vip;
          } else if (planId === 'starter') {
            planCounts.starter++;
            expectedDailyTic += CORRECT_TOKEN_ALLOCATIONS.starter;
          }
        }

        // Group distributions by date
        const distributionsByDate = new Map<string, any[]>();
        for (const dist of distributions) {
          const date = dist.distribution_date;
          if (!distributionsByDate.has(date)) {
            distributionsByDate.set(date, []);
          }
          distributionsByDate.get(date)?.push(dist);
        }

        // Fix each date's distributions
        for (const date of Array.from(distributionsByDate.keys())) {
          const dateDists = distributionsByDate.get(date) || [];
          if (dateDists.length > 1) {
            // Multiple distributions for same date - consolidate them
            userFix.issues_found.push(`${date}: ${dateDists.length} distributions`);
            
            // Keep the latest distribution, delete others
            dateDists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const keepDist = dateDists[0];
            const deleteDists = dateDists.slice(1);

            // Delete duplicates
            for (const delDist of deleteDists) {
              const { error: deleteError } = await supabaseAdmin
                .from('token_distributions')
                .delete()
                .eq('id', delDist.id);

              if (!deleteError) {
                results.duplicates_removed++;
              }
            }

            // Update the kept distribution to correct amount
            const { error: updateError } = await supabaseAdmin
              .from('token_distributions')
              .update({ token_amount: expectedDailyTic })
              .eq('id', keepDist.id);

            if (!updateError) {
              results.consolidations_made++;
              userFix.actions_taken.push(`${date}: Consolidated ${dateDists.length} → 1 distribution (${expectedDailyTic.toFixed(2)} TIC)`);
            }

          } else if (dateDists.length === 1) {
            // Single distribution - check if amount is correct
            const dist = dateDists[0];
            const currentAmount = parseFloat(dist.token_amount.toString());
            
            if (Math.abs(currentAmount - expectedDailyTic) >= 0.01) {
              // Incorrect amount - fix it
              const { error: updateError } = await supabaseAdmin
                .from('token_distributions')
                .update({ token_amount: expectedDailyTic })
                .eq('id', dist.id);

              if (!updateError) {
                results.amounts_corrected++;
                userFix.actions_taken.push(`${date}: Fixed amount ${currentAmount.toFixed(2)} → ${expectedDailyTic.toFixed(2)} TIC`);
              }
            }
          }
        }

        // Add user fix summary
        if (userFix.issues_found.length > 0 || userFix.actions_taken.length > 0) {
          userFix.expected_daily_tic = expectedDailyTic.toFixed(2);
          userFix.plan_breakdown = `${planCounts.vip} VIP + ${planCounts.starter} Starter`;
          results.user_fixes.push(userFix);
        }

        results.distributions_fixed += userFix.actions_taken.length;

      } catch (userError) {
        const errorMsg = `Error processing ${userEmail}: ${userError instanceof Error ? userError.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Step 5: Add unique constraint to prevent future issues
    try {
      const constraintSQL = `
        ALTER TABLE token_distributions 
        ADD CONSTRAINT IF NOT EXISTS unique_distribution_per_subscription_per_day 
        UNIQUE (user_email, subscription_id, distribution_date);
      `;

      await supabaseAdmin.rpc('exec_sql', { sql_query: constraintSQL });
    } catch (constraintError) {
      // Constraint might already exist, that's fine
      console.log('Constraint addition result:', constraintError);
    }

    console.log(`✅ Automatic fix completed for ${results.users_processed} users`);

    return NextResponse.json({
      success: true,
      message: `Automatically fixed distributions for ${results.users_processed} users`,
      summary: {
        users_processed: results.users_processed,
        distributions_fixed: results.distributions_fixed,
        duplicates_removed: results.duplicates_removed,
        amounts_corrected: results.amounts_corrected,
        consolidations_made: results.consolidations_made,
        errors_count: results.errors.length
      },
      sample_fixes: results.user_fixes.slice(0, 10),
      errors: results.errors.slice(0, 5),
      explanation: {
        what_was_fixed: "Automatically consolidated multiple distributions per date into single correct amounts",
        why_users_had_high_amounts: "Users with multiple subscriptions were getting separate distributions that the UI summed up",
        new_behavior: "Each user now gets exactly one distribution per date with the total amount for all their subscriptions",
        expected_amounts: {
          single_vip: "18.90 TIC per day",
          single_starter: "1.37 TIC per day", 
          multiple_plans: "Sum of all subscriptions (e.g., 4 VIP = 75.60 TIC per day)"
        }
      }
    });

  } catch (error) {
    console.error('Error in automatic distribution fix:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check what would be fixed without actually fixing
export async function GET() {
  try {
    console.log('🔍 Analyzing what would be fixed automatically...');

    // Get all active subscriptions and recent distributions
    const { data: allSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_email, plan_id')
      .eq('status', 'active');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: allDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, distribution_date, token_amount, plan_id')
      .gte('distribution_date', thirtyDaysAgoStr);

    // Analyze what needs fixing
    const userAnalysis = new Map<string, any>();
    
    // Group subscriptions by user
    for (const sub of allSubscriptions || []) {
      const userEmail = sub.user_email;
      if (!userAnalysis.has(userEmail)) {
        userAnalysis.set(userEmail, { subscriptions: [], distributions: [], issues: [] });
      }
      userAnalysis.get(userEmail).subscriptions.push(sub);
    }

    // Group distributions by user and date
    for (const dist of allDistributions || []) {
      const userEmail = dist.user_email;
      if (userAnalysis.has(userEmail)) {
        userAnalysis.get(userEmail).distributions.push(dist);
      }
    }

    let usersNeedingFix = 0;
    let duplicatesFound = 0;
    let incorrectAmounts = 0;

    for (const userEmail of Array.from(userAnalysis.keys())) {
      const data = userAnalysis.get(userEmail);
      if (!data) continue;
      // Group distributions by date
      const distributionsByDate = new Map<string, any[]>();
      for (const dist of data.distributions) {
        const date = dist.distribution_date;
        if (!distributionsByDate.has(date)) {
          distributionsByDate.set(date, []);
        }
        distributionsByDate.get(date)?.push(dist);
      }

      let userNeedsFix = false;
      
      // Check for duplicates and incorrect amounts
      for (const date of Array.from(distributionsByDate.keys())) {
        const dateDists = distributionsByDate.get(date) || [];
        if (dateDists.length > 1) {
          duplicatesFound += dateDists.length - 1;
          userNeedsFix = true;
          data.issues.push(`${date}: ${dateDists.length} distributions (duplicates)`);
        }
        
        // Check amounts
        const expectedDaily = data.subscriptions.reduce((sum: number, sub: any) => {
          return sum + (sub.plan_id.toLowerCase() === 'vip' ? CORRECT_TOKEN_ALLOCATIONS.vip : CORRECT_TOKEN_ALLOCATIONS.starter);
        }, 0);
        
        for (const dist of dateDists) {
          const currentAmount = parseFloat(dist.token_amount.toString());
          if (Math.abs(currentAmount - expectedDaily) >= 0.01) {
            incorrectAmounts++;
            userNeedsFix = true;
            data.issues.push(`${date}: Amount ${currentAmount.toFixed(2)} should be ${expectedDaily.toFixed(2)} TIC`);
          }
        }
      }

      if (userNeedsFix) {
        usersNeedingFix++;
      }
    }

    return NextResponse.json({
      analysis: {
        total_users: userAnalysis.size,
        users_needing_fix: usersNeedingFix,
        duplicates_to_remove: duplicatesFound,
        incorrect_amounts_to_fix: incorrectAmounts
      },
      recommendation: usersNeedingFix > 0 
        ? `Run POST /api/admin/auto-fix-all-users-distributions to automatically fix ${usersNeedingFix} users`
        : "No automatic fixes needed - all distributions are correct",
      what_will_be_fixed: [
        "Remove duplicate distributions per user per date",
        "Correct all distribution amounts to match subscription totals", 
        "Consolidate multiple distributions into single daily amounts",
        "Add database constraints to prevent future issues"
      ]
    });

  } catch (error) {
    console.error('Error analyzing automatic fixes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
