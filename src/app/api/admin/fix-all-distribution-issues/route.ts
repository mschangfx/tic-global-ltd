import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Correct token allocations
const CORRECT_TOKEN_ALLOCATIONS = {
  'vip': 6900 / 365,      // 18.904109589 TIC per day
  'starter': 500 / 365    // 1.369863014 TIC per day
} as const;

// POST - Comprehensive fix for all TIC distribution issues
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting comprehensive TIC distribution fix...');

    const results = {
      step1_duplicates: { success: false, message: '', details: {} },
      step2_amounts: { success: false, message: '', details: {} },
      step3_constraint: { success: false, message: '', details: {} },
      summary: {}
    };

    // STEP 1: Fix Duplicates
    console.log('📋 Step 1: Removing duplicate distributions...');
    try {
      // Get all distributions to find duplicates
      const { data: allDistributions, error: fetchError } = await supabaseAdmin
        .from('token_distributions')
        .select('id, user_email, subscription_id, distribution_date, created_at, token_amount')
        .order('user_email, subscription_id, distribution_date, created_at');

      if (fetchError) throw fetchError;

      // Find and remove duplicates
      const duplicateGroups = new Map<string, any[]>();
      const seen = new Set<string>();
      
      for (const dist of allDistributions || []) {
        const key = `${dist.user_email}-${dist.subscription_id}-${dist.distribution_date}`;
        if (seen.has(key)) {
          if (!duplicateGroups.has(key)) {
            duplicateGroups.set(key, []);
          }
          duplicateGroups.get(key)?.push(dist);
        } else {
          seen.add(key);
        }
      }

      let deletedCount = 0;
      const duplicateEntries = Array.from(duplicateGroups.entries());
      
      for (const [key, duplicates] of duplicateEntries) {
        // Sort by created_at descending and delete all but the first (latest)
        duplicates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        for (let i = 1; i < duplicates.length; i++) {
          const { error: deleteError } = await supabaseAdmin
            .from('token_distributions')
            .delete()
            .eq('id', duplicates[i].id);
            
          if (!deleteError) {
            deletedCount++;
          }
        }
      }

      results.step1_duplicates = {
        success: true,
        message: `Removed ${deletedCount} duplicate distributions`,
        details: { duplicates_removed: deletedCount, duplicate_groups: duplicateGroups.size }
      };

    } catch (error) {
      results.step1_duplicates = {
        success: false,
        message: `Duplicate removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {}
      };
    }

    // STEP 2: Fix Incorrect Amounts
    console.log('💰 Step 2: Correcting distribution amounts...');
    try {
      // Get all remaining distributions
      const { data: distributions, error: fetchError2 } = await supabaseAdmin
        .from('token_distributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError2) throw fetchError2;

      let correctedCount = 0;
      const corrections = [];

      for (const dist of distributions || []) {
        const currentAmount = parseFloat(dist.token_amount.toString());
        const planId = dist.plan_id.toLowerCase();
        const correctAmount = CORRECT_TOKEN_ALLOCATIONS[planId as keyof typeof CORRECT_TOKEN_ALLOCATIONS];
        
        // Check if amount needs correction (tolerance of 0.01)
        if (Math.abs(currentAmount - correctAmount) >= 0.01) {
          const { error: updateError } = await supabaseAdmin
            .from('token_distributions')
            .update({ token_amount: correctAmount })
            .eq('id', dist.id);

          if (!updateError) {
            correctedCount++;
            corrections.push({
              id: dist.id,
              user_email: dist.user_email,
              plan_id: dist.plan_id,
              old_amount: currentAmount,
              new_amount: correctAmount
            });
          }
        }
      }

      results.step2_amounts = {
        success: true,
        message: `Corrected ${correctedCount} distribution amounts`,
        details: { 
          corrections_made: correctedCount,
          sample_corrections: corrections.slice(0, 5),
          expected_amounts: {
            vip: CORRECT_TOKEN_ALLOCATIONS.vip,
            starter: CORRECT_TOKEN_ALLOCATIONS.starter
          }
        }
      };

    } catch (error) {
      results.step2_amounts = {
        success: false,
        message: `Amount correction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {}
      };
    }

    // STEP 3: Add Unique Constraint
    console.log('🔒 Step 3: Adding unique constraint...');
    try {
      const constraintSQL = `
        ALTER TABLE token_distributions 
        ADD CONSTRAINT unique_distribution_per_subscription_per_day 
        UNIQUE (user_email, subscription_id, distribution_date);
      `;

      const { error: constraintError } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: constraintSQL
      });

      if (constraintError && !constraintError.message?.includes('already exists')) {
        throw constraintError;
      }

      results.step3_constraint = {
        success: true,
        message: 'Unique constraint added successfully',
        details: { constraint_exists: true }
      };

    } catch (error) {
      results.step3_constraint = {
        success: false,
        message: `Constraint addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {}
      };
    }

    // Final verification
    const { data: finalDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('id', { count: 'exact' });

    const { data: finalUsers } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email');
    
    const uniqueUsers = Array.from(new Set(finalUsers?.map(u => u.user_email) || []));

    results.summary = {
      total_distributions: finalDistributions?.length || 0,
      unique_users: uniqueUsers.length,
      all_steps_successful: results.step1_duplicates.success && 
                           results.step2_amounts.success && 
                           results.step3_constraint.success,
      expected_amounts: {
        vip: `${CORRECT_TOKEN_ALLOCATIONS.vip.toFixed(2)} TIC per day`,
        starter: `${CORRECT_TOKEN_ALLOCATIONS.starter.toFixed(2)} TIC per day`
      }
    };

    console.log('✅ Comprehensive TIC distribution fix completed');

    return NextResponse.json({
      success: true,
      message: 'Comprehensive TIC distribution fix completed',
      results: results
    });

  } catch (error) {
    console.error('Error in comprehensive distribution fix:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check current status of all distribution issues
export async function GET() {
  try {
    // Check duplicates
    const { data: allDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, subscription_id, distribution_date, token_amount, plan_id');

    const duplicateGroups = new Map<string, number>();
    const incorrectAmounts = [];
    
    for (const dist of allDistributions || []) {
      const key = `${dist.user_email}-${dist.subscription_id}-${dist.distribution_date}`;
      duplicateGroups.set(key, (duplicateGroups.get(key) || 0) + 1);
      
      // Check amount correctness
      const amount = parseFloat(dist.token_amount.toString());
      const planId = dist.plan_id.toLowerCase();
      const correctAmount = CORRECT_TOKEN_ALLOCATIONS[planId as keyof typeof CORRECT_TOKEN_ALLOCATIONS];
      
      if (Math.abs(amount - correctAmount) >= 0.01) {
        incorrectAmounts.push({
          amount: amount,
          expected: correctAmount,
          plan_id: dist.plan_id,
          difference: amount - correctAmount
        });
      }
    }
    
    const duplicateCount = Array.from(duplicateGroups.values()).filter(count => count > 1).length;

    return NextResponse.json({
      issues_found: {
        duplicates: duplicateCount,
        incorrect_amounts: incorrectAmounts.length
      },
      needs_fix: duplicateCount > 0 || incorrectAmounts.length > 0,
      sample_incorrect_amounts: incorrectAmounts.slice(0, 5),
      expected_amounts: {
        vip: CORRECT_TOKEN_ALLOCATIONS.vip,
        starter: CORRECT_TOKEN_ALLOCATIONS.starter
      },
      recommendation: duplicateCount > 0 || incorrectAmounts.length > 0 
        ? 'Run POST /api/admin/fix-all-distribution-issues to fix all issues'
        : 'No issues found - all distributions are correct'
    });

  } catch (error) {
    console.error('Error checking distribution status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
