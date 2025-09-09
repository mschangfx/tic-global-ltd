import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('Seeding sample transactions for:', userEmail);

    // Sample transactions to add
    const sampleTransactions = [
      // Deposits
      {
        table: 'deposits',
        data: {
          user_email: userEmail,
          amount: 100.00,
          currency: 'USDT',
          network: 'TRC20',
          wallet_address: 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF',
          status: 'completed',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        }
      },
      {
        table: 'deposits',
        data: {
          user_email: userEmail,
          amount: 50.00,
          currency: 'ETH',
          network: 'Ethereum',
          wallet_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          status: 'pending',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      },
      
      // Withdrawals
      {
        table: 'withdrawal_requests',
        data: {
          user_email: userEmail,
          amount: 25.00,
          currency: 'USDT',
          destination_address: 'TXYZabc123def456ghi789jkl012mno345pqr678',
          status: 'completed',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
        }
      },
      
      // Transfers
      {
        table: 'user_transfers',
        data: {
          sender_email: userEmail,
          recipient_email: 'friend@example.com',
          recipient_wallet_address: 'TFriend123456789',
          transfer_amount: 20.00,
          fee_amount: 0.40,
          total_deducted: 20.40,
          note: 'Payment for services',
          status: 'completed',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
        }
      },
      {
        table: 'user_transfers',
        data: {
          sender_email: 'sender@example.com',
          recipient_email: userEmail,
          recipient_wallet_address: 'TMyWallet123456',
          transfer_amount: 15.00,
          fee_amount: 0.30,
          total_deducted: 15.30,
          note: 'Refund',
          status: 'completed',
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
        }
      },
      
      // Wallet Transactions (TIC, GIC, Staking)
      {
        table: 'wallet_transactions',
        data: {
          user_email: userEmail,
          transaction_type: 'tic_reward',
          amount: 5.00,
          currency: 'TIC',
          description: 'Daily TIC reward distribution',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
        }
      },
      {
        table: 'wallet_transactions',
        data: {
          user_email: userEmail,
          transaction_type: 'gic_purchase',
          amount: -10.00,
          currency: 'USD',
          description: 'Purchased 10 GIC tokens',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
        }
      },
      {
        table: 'wallet_transactions',
        data: {
          user_email: userEmail,
          transaction_type: 'staking_reward',
          amount: 2.50,
          currency: 'USD',
          description: 'Staking rewards for 30 days',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // 8 hours ago
        }
      },
      
      // Trader Activation
      {
        table: 'transactions',
        data: {
          user_email: userEmail,
          transaction_type: 'trader_activation',
          amount: 62.50,
          currency: 'USD',
          status: 'completed',
          request_metadata: {
            packages_activated: 25,
            package_type: 'usd_2.50_package',
            activation_timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            transaction_source: 'trader_dashboard'
          },
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      }
    ];

    const results = [];

    // Insert sample transactions
    for (const transaction of sampleTransactions) {
      try {
        const { data, error } = await supabaseAdmin
          .from(transaction.table)
          .insert(transaction.data)
          .select()
          .single();

        if (error) {
          console.error(`Error inserting ${transaction.table}:`, error);
          results.push({
            table: transaction.table,
            success: false,
            error: error.message
          });
        } else {
          results.push({
            table: transaction.table,
            success: true,
            id: data.id
          });
        }
      } catch (err) {
        console.error(`Exception inserting ${transaction.table}:`, err);
        results.push({
          table: transaction.table,
          success: false,
          error: err instanceof Error ? (err as Error).message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: true,
      message: `Seeded ${successCount}/${totalCount} sample transactions`,
      userEmail,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('Error seeding transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed transactions',
        message: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
