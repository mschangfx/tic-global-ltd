import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userEmail, amount, planId } = await request.json();

    if (!userEmail || !amount || !planId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userEmail, amount, planId' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test the database function directly
    console.log('Testing wallet function with:', { userEmail, amount, planId });

    const { data, error } = await supabase.rpc('increment_tic_balance_daily_distribution', {
      user_email: userEmail,
      tic_amount: amount,
      plan_id: planId
    });

    if (error) {
      console.error('Database function error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        function_called: 'increment_tic_balance_daily_distribution',
        parameters: { user_email: userEmail, tic_amount: amount, plan_id: planId }
      });
    }

    console.log('Database function result:', data);

    // Also check the user's current wallet balance
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallets')
      .select('tic_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Wallet query error:', walletError);
    }

    // Check recent distribution records
    const { data: distributionData, error: distributionError } = await supabase
      .from('tic_distribution_log')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(5);

    if (distributionError) {
      console.error('Distribution log query error:', distributionError);
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet function test completed successfully',
      function_result: data,
      current_wallet_balance: walletData?.tic_balance || 'Unknown',
      recent_distributions: distributionData || [],
      test_parameters: {
        user_email: userEmail,
        tic_amount: amount,
        plan_id: planId
      }
    });

  } catch (error) {
    console.error('Test wallet function error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Wallet function test endpoint. Use POST with userEmail, amount, and planId.',
    example: {
      userEmail: 'user@example.com',
      amount: 1.37,
      planId: 'starter'
    }
  });
}
