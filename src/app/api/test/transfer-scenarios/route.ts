import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: 'User email is required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing transfer scenarios for user: ${userEmail}`);

    // Get current wallet state
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, message: 'Wallet not found', error: walletError?.message },
        { status: 404 }
      );
    }

    const currentBalances = {
      main_wallet: parseFloat(wallet.total_balance || '0'),
      tic_wallet: parseFloat(wallet.tic_balance || '0'),
      gic_wallet: parseFloat(wallet.gic_balance || '0'),
      staking_wallet: parseFloat(wallet.staking_balance || '0'),
      partner_wallet: parseFloat(wallet.partner_wallet_balance || '0')
    };

    console.log('📊 Current wallet balances:', currentBalances);

    // Test scenarios to validate
    const testScenarios = [
      {
        name: 'TIC → Main Wallet',
        from: 'tic',
        to: 'total',
        amount: 5,
        description: 'Transfer $5 from TIC to Main Wallet'
      },
      {
        name: 'GIC → Main Wallet', 
        from: 'gic',
        to: 'total',
        amount: 3,
        description: 'Transfer $3 from GIC to Main Wallet'
      },
      {
        name: 'Partner → Main Wallet',
        from: 'partner_wallet',
        to: 'total', 
        amount: 2,
        description: 'Transfer $2 from Partner Wallet to Main Wallet'
      },
      {
        name: 'Main → TIC Wallet',
        from: 'total',
        to: 'tic',
        amount: 4,
        description: 'Transfer $4 from Main Wallet to TIC'
      },
      {
        name: 'Main → GIC Wallet',
        from: 'total',
        to: 'gic',
        amount: 6,
        description: 'Transfer $6 from Main Wallet to GIC'
      },
      {
        name: 'Main → Partner Wallet',
        from: 'total',
        to: 'partner_wallet',
        amount: 1,
        description: 'Transfer $1 from Main Wallet to Partner Wallet'
      }
    ];

    const results = [];

    for (const scenario of testScenarios) {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      
      // Check if sufficient balance exists
      let fromBalance: number;
      if (scenario.from === 'total') {
        fromBalance = currentBalances.main_wallet;
      } else if (scenario.from === 'tic') {
        fromBalance = currentBalances.tic_wallet;
      } else if (scenario.from === 'gic') {
        fromBalance = currentBalances.gic_wallet;
      } else if (scenario.from === 'staking') {
        fromBalance = currentBalances.staking_wallet;
      } else if (scenario.from === 'partner_wallet') {
        fromBalance = currentBalances.partner_wallet;
      } else {
        fromBalance = 0;
      }
        
      if (fromBalance < scenario.amount) {
        results.push({
          scenario: scenario.name,
          status: 'SKIPPED',
          reason: `Insufficient balance: ${fromBalance} < ${scenario.amount}`,
          from_balance: fromBalance,
          amount: scenario.amount
        });
        console.log(`⚠️ Skipping ${scenario.name}: Insufficient balance (${fromBalance} < ${scenario.amount})`);
        continue;
      }

      // Simulate the transfer logic
      const expectedChanges = {
        from_account: scenario.from,
        to_account: scenario.to,
        amount: scenario.amount,
        from_balance_before: fromBalance,
        from_balance_after: fromBalance - scenario.amount,
        to_balance_before: (() => {
          if (scenario.to === 'total') return currentBalances.main_wallet;
          if (scenario.to === 'tic') return currentBalances.tic_wallet;
          if (scenario.to === 'gic') return currentBalances.gic_wallet;
          if (scenario.to === 'staking') return currentBalances.staking_wallet;
          if (scenario.to === 'partner_wallet') return currentBalances.partner_wallet;
          return 0;
        })(),
        to_balance_after: (() => {
          const toBalance = scenario.to === 'total' ? currentBalances.main_wallet :
            scenario.to === 'tic' ? currentBalances.tic_wallet :
            scenario.to === 'gic' ? currentBalances.gic_wallet :
            scenario.to === 'staking' ? currentBalances.staking_wallet :
            scenario.to === 'partner_wallet' ? currentBalances.partner_wallet : 0;
          return toBalance + scenario.amount;
        })()
      };

      results.push({
        scenario: scenario.name,
        status: 'READY',
        description: scenario.description,
        expected_changes: expectedChanges,
        database_fields_to_update: {
          from_field: scenario.from === 'total' ? 'total_balance' : `${scenario.from}_balance`,
          to_field: scenario.to === 'total' ? 'total_balance' : `${scenario.to}_balance`,
          total_balance_change: scenario.from === 'total' ? -scenario.amount : scenario.to === 'total' ? scenario.amount : 0
        }
      });

      console.log(`✅ ${scenario.name} ready for execution`);
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer scenarios analyzed',
      user_email: userEmail,
      current_balances: currentBalances,
      test_scenarios: results,
      summary: {
        total_scenarios: testScenarios.length,
        ready_scenarios: results.filter(r => r.status === 'READY').length,
        skipped_scenarios: results.filter(r => r.status === 'SKIPPED').length
      }
    });

  } catch (error) {
    console.error('❌ Transfer scenario test error:', error);
    return NextResponse.json(
      { success: false, message: 'Transfer scenario test failed', error: error instanceof Error ? (error as Error).message : 'Unknown error' },
      { status: 500 }
    );
  }
}
