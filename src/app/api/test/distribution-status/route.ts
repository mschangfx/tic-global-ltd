import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the database function exists by checking system tables
    let functionExists = false;
    let functionError = null;

    try {
      // Check if function exists in pg_proc
      const { data: funcCheck, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'increment_tic_balance_daily_distribution')
        .limit(1);

      if (funcError) {
        functionError = funcError;
        functionExists = false;
      } else {
        functionExists = funcCheck && funcCheck.length > 0;
      }
    } catch (err) {
      functionError = err;
      functionExists = false;
    }

    // Check active subscriptions (without nested relationship)
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .select('id, user_email, plan_id, status, created_at')
      .eq('status', 'active');

    // Get subscription plans separately
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('plan_id, name, daily_tic_amount');

    // Check recent distributions
    const { data: recentDistributions, error: distributionsError } = await supabase
      .from('tic_distribution_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Check wallet balances
    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select('user_email, tic_balance')
      .order('tic_balance', { ascending: false })
      .limit(10);

    // Check if distribution has run today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayDistributions, error: todayError } = await supabase
      .from('tic_distribution_log')
      .select('*')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database_function: {
        exists: !functionError,
        error: functionError ? (functionError as any).message || 'Unknown error' : null,
        test_result: functionExists
      },
      active_subscriptions: {
        count: subscriptions?.length || 0,
        data: subscriptions || [],
        error: subscriptionsError?.message || null
      },
      subscription_plans: {
        count: plans?.length || 0,
        data: plans || [],
        error: plansError?.message || null,
        relationship_working: !plansError && !subscriptionsError
      },
      recent_distributions: {
        count: recentDistributions?.length || 0,
        data: recentDistributions || [],
        error: distributionsError?.message || null
      },
      today_distributions: {
        count: todayDistributions?.length || 0,
        data: todayDistributions || [],
        error: todayError?.message || null,
        has_run_today: (todayDistributions?.length || 0) > 0
      },
      top_wallets: {
        count: wallets?.length || 0,
        data: wallets || [],
        error: walletsError?.message || null
      },
      summary: {
        function_working: !functionError,
        has_active_subscriptions: (subscriptions?.length || 0) > 0,
        distribution_ran_today: (todayDistributions?.length || 0) > 0,
        total_users_with_wallets: wallets?.length || 0
      }
    });

  } catch (error) {
    console.error('Distribution status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
