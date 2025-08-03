import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Test 1: Check if referral tables exist and are accessible
    const tests = {
      referralCodesTable: false,
      relationshipsTable: false,
      commissionsTable: false,
      userPlansTable: false,
      sampleDataExists: false
    };

    // Test referral codes table
    try {
      const { data, error } = await supabase
        .from('user_referral_codes')
        .select('count(*)')
        .limit(1);
      tests.referralCodesTable = !error;
    } catch (e) {
      console.error('Referral codes table test failed:', e);
    }

    // Test relationships table
    try {
      const { data, error } = await supabase
        .from('referral_relationships')
        .select('count(*)')
        .limit(1);
      tests.relationshipsTable = !error;
    } catch (e) {
      console.error('Relationships table test failed:', e);
    }

    // Test commissions table
    try {
      const { data, error } = await supabase
        .from('referral_commissions')
        .select('count(*)')
        .limit(1);
      tests.commissionsTable = !error;
    } catch (e) {
      console.error('Commissions table test failed:', e);
    }

    // Test user plans table
    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('count(*)')
        .limit(1);
      tests.userPlansTable = !error;
    } catch (e) {
      console.error('User plans table test failed:', e);
    }

    // Check if there's any sample data
    try {
      const { data: codes } = await supabase
        .from('user_referral_codes')
        .select('user_email')
        .limit(5);
      
      const { data: relationships } = await supabase
        .from('referral_relationships')
        .select('referrer_email')
        .limit(5);
      
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('earner_email')
        .limit(5);

      tests.sampleDataExists = (codes?.length || 0) > 0 || 
                               (relationships?.length || 0) > 0 || 
                               (commissions?.length || 0) > 0;
    } catch (e) {
      console.error('Sample data check failed:', e);
    }

    // Test API endpoints
    const apiTests = {
      referralApiWorking: false,
      commissionCalculationWorking: false
    };

    // Test referral API
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: 'test@example.com',
          action: 'get-commission-structure'
        })
      });
      apiTests.referralApiWorking = response.ok;
    } catch (e) {
      console.error('Referral API test failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Referral system test completed',
      databaseTests: tests,
      apiTests,
      systemStatus: {
        allTablesAccessible: Object.values(tests).every(t => t === true),
        apiEndpointsWorking: Object.values(apiTests).every(t => t === true),
        readyForRealTransactions: Object.values(tests).slice(0, 4).every(t => t === true)
      },
      recommendations: {
        needsAuthentication: !tests.sampleDataExists,
        needsTestData: !tests.sampleDataExists,
        systemReady: Object.values(tests).slice(0, 4).every(t => t === true)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System test error:', error);
    return NextResponse.json({
      success: false,
      error: 'System test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to create test data
export async function POST(request: NextRequest) {
  try {
    const { action, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    const supabase = createClient();

    switch (action) {
      case 'create-test-user':
        // Create a test user with referral code
        const referralCode = `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const referralLink = `https://ticgloballtd.com/join?ref=${referralCode}`;

        const { data: newUser, error: userError } = await supabase
          .from('user_referral_codes')
          .upsert({
            user_email: userEmail,
            referral_code: referralCode,
            referral_link: referralLink,
            total_referrals: 0,
            total_earnings: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_email'
          })
          .select()
          .single();

        if (userError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to create test user',
            details: userError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Test user created successfully',
          data: newUser
        });

      case 'simulate-vip-purchase':
        // Simulate a VIP plan purchase and commission calculation
        const { data: commission, error: commissionError } = await supabase
          .from('referral_commissions')
          .insert({
            earner_email: userEmail,
            referral_email: 'buyer@example.com',
            commission_level: 1,
            commission_rate: 10.0,
            base_earnings: 0.44,
            commission_amount: 0.044,
            plan_type: 'vip',
            calculation_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (commissionError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to simulate commission',
            details: commissionError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'VIP purchase simulation completed',
          data: commission
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Test creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
