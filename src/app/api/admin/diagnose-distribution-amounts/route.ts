import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Correct token allocations
const CORRECT_TOKEN_ALLOCATIONS = {
  'vip': 6900 / 365,      // 18.904109589 TIC per day
  'starter': 500 / 365    // 1.369863014 TIC per day
} as const;

// GET - Diagnose current distribution amounts in database
export async function GET() {
  try {
    console.log('🔍 Diagnosing TIC distribution amounts in database...');

    // Get all recent distributions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: distributions, error: fetchError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .gte('distribution_date', thirtyDaysAgoStr)
      .order('distribution_date', { ascending: false });

    if (fetchError) {
      console.error('Error fetching distributions:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch distributions',
        details: fetchError.message
      }, { status: 500 });
    }

    // Analyze the amounts
    const analysis = {
      total_distributions: distributions?.length || 0,
      correct_amounts: 0,
      incorrect_amounts: 0,
      amount_breakdown: {} as any,
      incorrect_records: [] as any[],
      correct_records: [] as any[],
      unique_amounts: new Set<number>(),
      plan_analysis: {
        vip: { correct: 0, incorrect: 0, amounts: [] as number[] },
        starter: { correct: 0, incorrect: 0, amounts: [] as number[] }
      }
    };

    for (const dist of distributions || []) {
      const amount = parseFloat(dist.token_amount.toString());
      const planId = dist.plan_id.toLowerCase();
      const correctAmount = CORRECT_TOKEN_ALLOCATIONS[planId as keyof typeof CORRECT_TOKEN_ALLOCATIONS];
      
      analysis.unique_amounts.add(amount);
      
      // Check if amount is correct (within 0.01 tolerance)
      const isCorrect = Math.abs(amount - correctAmount) < 0.01;
      
      if (isCorrect) {
        analysis.correct_amounts++;
        analysis.correct_records.push({
          id: dist.id,
          user_email: dist.user_email,
          plan_id: dist.plan_id,
          amount: amount,
          date: dist.distribution_date,
          expected: correctAmount
        });
        analysis.plan_analysis[planId as keyof typeof analysis.plan_analysis].correct++;
      } else {
        analysis.incorrect_amounts++;
        analysis.incorrect_records.push({
          id: dist.id,
          user_email: dist.user_email,
          plan_id: dist.plan_id,
          amount: amount,
          date: dist.distribution_date,
          expected: correctAmount,
          difference: amount - correctAmount
        });
        analysis.plan_analysis[planId as keyof typeof analysis.plan_analysis].incorrect++;
      }
      
      analysis.plan_analysis[planId as keyof typeof analysis.plan_analysis].amounts.push(amount);
      
      // Track amount frequency
      if (!analysis.amount_breakdown[amount]) {
        analysis.amount_breakdown[amount] = 0;
      }
      analysis.amount_breakdown[amount]++;
    }

    // Convert Set to Array for JSON serialization
    const uniqueAmountsArray = Array.from(analysis.unique_amounts);

    // Get sample incorrect records (first 10)
    const sampleIncorrectRecords = analysis.incorrect_records.slice(0, 10);

    return NextResponse.json({
      summary: {
        total_distributions: analysis.total_distributions,
        correct_amounts: analysis.correct_amounts,
        incorrect_amounts: analysis.incorrect_amounts,
        accuracy_percentage: analysis.total_distributions > 0 
          ? ((analysis.correct_amounts / analysis.total_distributions) * 100).toFixed(2)
          : '0'
      },
      expected_amounts: {
        vip: CORRECT_TOKEN_ALLOCATIONS.vip,
        starter: CORRECT_TOKEN_ALLOCATIONS.starter
      },
      unique_amounts_found: uniqueAmountsArray.sort((a, b) => b - a),
      amount_frequency: analysis.amount_breakdown,
      plan_breakdown: {
        vip: {
          correct_count: analysis.plan_analysis.vip.correct,
          incorrect_count: analysis.plan_analysis.vip.incorrect,
          unique_amounts: Array.from(new Set(analysis.plan_analysis.vip.amounts)).sort((a, b) => b - a)
        },
        starter: {
          correct_count: analysis.plan_analysis.starter.correct,
          incorrect_count: analysis.plan_analysis.starter.incorrect,
          unique_amounts: Array.from(new Set(analysis.plan_analysis.starter.amounts)).sort((a, b) => b - a)
        }
      },
      sample_incorrect_records: sampleIncorrectRecords,
      recommendations: analysis.incorrect_amounts > 0 ? [
        'Run POST /api/admin/fix-distribution-amounts to correct all incorrect amounts',
        'Consider running the duplicate fix API first if duplicates exist',
        'Verify that only the main cron job is creating distributions'
      ] : [
        'All distribution amounts are correct!',
        'No action needed for amount correction'
      ]
    });

  } catch (error) {
    console.error('Error diagnosing distribution amounts:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Fix incorrect distribution amounts
export async function POST() {
  try {
    console.log('🔧 Starting distribution amount correction...');

    // Get all distributions with incorrect amounts
    const { data: distributions, error: fetchError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching distributions:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch distributions',
        details: fetchError.message
      }, { status: 500 });
    }

    let correctedCount = 0;
    const corrections = [];

    for (const dist of distributions || []) {
      const currentAmount = parseFloat(dist.token_amount.toString());
      const planId = dist.plan_id.toLowerCase();
      const correctAmount = CORRECT_TOKEN_ALLOCATIONS[planId as keyof typeof CORRECT_TOKEN_ALLOCATIONS];
      
      // Check if amount needs correction (tolerance of 0.01)
      if (Math.abs(currentAmount - correctAmount) >= 0.01) {
        console.log(`🔧 Correcting ${dist.id}: ${currentAmount} → ${correctAmount} TIC (${planId})`);
        
        const { error: updateError } = await supabaseAdmin
          .from('token_distributions')
          .update({ token_amount: correctAmount })
          .eq('id', dist.id);

        if (updateError) {
          console.error(`Error updating distribution ${dist.id}:`, updateError);
        } else {
          correctedCount++;
          corrections.push({
            id: dist.id,
            user_email: dist.user_email,
            plan_id: dist.plan_id,
            date: dist.distribution_date,
            old_amount: currentAmount,
            new_amount: correctAmount,
            difference: correctAmount - currentAmount
          });
        }
      }
    }

    console.log(`✅ Corrected ${correctedCount} distribution amounts`);

    return NextResponse.json({
      success: true,
      message: `Successfully corrected ${correctedCount} distribution amounts`,
      corrections_made: correctedCount,
      sample_corrections: corrections.slice(0, 10),
      total_corrections: corrections.length,
      expected_amounts: {
        vip: `${CORRECT_TOKEN_ALLOCATIONS.vip.toFixed(6)} TIC per day`,
        starter: `${CORRECT_TOKEN_ALLOCATIONS.starter.toFixed(6)} TIC per day`
      }
    });

  } catch (error) {
    console.error('Error fixing distribution amounts:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
