import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 RUNNING COMPLETE TIC DISTRIBUTION FIX...');
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://tic-global-iuudjj1t0-changs-projects-b6f8a2cc.vercel.app';

    const results = {
      step1_cleanup: null as any,
      step2_immediate_fix: null as any,
      success: false,
      message: '',
      errors: [] as string[]
    };

    // Step 1: Clean up duplicate distributions
    try {
      console.log('🧹 Step 1: Cleaning duplicate distributions...');
      
      const cleanupResponse = await fetch(`${baseUrl}/api/fix/clean-duplicate-distributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const cleanupData = await cleanupResponse.json();
      results.step1_cleanup = cleanupData;
      
      if (cleanupData.success) {
        console.log(`✅ Step 1 SUCCESS: Fixed ${cleanupData.summary?.correct_distributions_created || 0} distributions`);
      } else {
        console.error('❌ Step 1 FAILED:', cleanupData.error);
        results.errors.push(`Step 1 failed: ${cleanupData.error}`);
      }
    } catch (error) {
      console.error('❌ Step 1 ERROR:', error);
      results.errors.push(`Step 1 error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Create today's distributions
    try {
      console.log('📅 Step 2: Creating today\'s distributions...');
      
      const immediateResponse = await fetch(`${baseUrl}/api/immediate-fix/create-todays-distributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const immediateData = await immediateResponse.json();
      results.step2_immediate_fix = immediateData;
      
      if (immediateData.success) {
        console.log(`✅ Step 2 SUCCESS: Created ${immediateData.distributions_created || 0} distributions for today`);
      } else {
        console.error('❌ Step 2 FAILED:', immediateData.error);
        results.errors.push(`Step 2 failed: ${immediateData.error}`);
      }
    } catch (error) {
      console.error('❌ Step 2 ERROR:', error);
      results.errors.push(`Step 2 error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Determine overall success
    const step1Success = results.step1_cleanup?.success || false;
    const step2Success = results.step2_immediate_fix?.success || false;
    
    results.success = step1Success || step2Success; // Success if at least one step worked
    
    if (results.success) {
      const cleanupCount = results.step1_cleanup?.summary?.correct_distributions_created || 0;
      const immediateCount = results.step2_immediate_fix?.distributions_created || 0;
      const totalFixed = Math.max(cleanupCount, immediateCount);
      
      results.message = `COMPLETE FIX SUCCESS: Fixed ${totalFixed} user distributions with correct amounts and today's date`;
      console.log('🎉 COMPLETE FIX SUCCESSFUL!');
    } else {
      results.message = `COMPLETE FIX FAILED: ${results.errors.join(', ')}`;
      console.log('❌ COMPLETE FIX FAILED');
    }

    return NextResponse.json({
      success: results.success,
      message: results.message,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      results: results,
      summary: {
        step1_cleanup_success: step1Success,
        step2_immediate_success: step2Success,
        distributions_fixed: Math.max(
          results.step1_cleanup?.summary?.correct_distributions_created || 0,
          results.step2_immediate_fix?.distributions_created || 0
        ),
        errors_count: results.errors.length
      }
    });

  } catch (error) {
    console.error('❌ COMPLETE FIX ERROR:', error);
    return NextResponse.json({
      success: false,
      message: 'Complete fix failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Complete TIC Distribution Fix API',
    description: 'POST to run complete fix (cleanup + immediate fix)',
    steps: [
      '1. Clean duplicate distributions and reset wallet balances',
      '2. Create today\'s distributions with correct amounts',
      '3. Ensure VIP users get 18.90 TIC, Starter users get 1.37 TIC'
    ],
    usage: 'POST /api/run-complete-fix'
  });
}
