import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET() {
  try {
    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('deposits')
      .select('count')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: testError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test environment variables
    const envCheck = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      nodeEnv: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      message: 'Deposit system debug info',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabaseConnection: 'Working',
      depositsTableAccess: 'Working'
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test creating a deposit record
    const testDeposit = {
      user_email: 'test@example.com',
      transaction_hash: `test_${Date.now()}`,
      method_id: 'usdt_trc20',
      method_name: 'USDT (TRC20)',
      amount: 100,
      currency: 'USD',
      network: 'TRC20',
      deposit_address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
      status: 'pending',
      request_metadata: {
        test: true,
        timestamp: new Date().toISOString()
      },
      admin_notes: 'Test deposit for debugging',
      created_at: new Date().toISOString()
    };

    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert(testDeposit)
      .select()
      .single();

    if (depositError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create test deposit',
        details: depositError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Clean up test deposit
    await supabase
      .from('deposits')
      .delete()
      .eq('id', deposit.id);

    return NextResponse.json({
      success: true,
      message: 'Deposit creation test successful',
      testDepositId: deposit.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug POST failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
