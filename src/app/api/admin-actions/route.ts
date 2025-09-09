import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple admin key for API access (you can call this from Postman, curl, etc.)
const ADMIN_API_KEY = 'admin_key_2024_tic_global';

// Helper function to format transaction data
function formatTransaction(transaction: any, type: string) {
  return {
    id: transaction.id,
    user_email: transaction.user_email,
    amount: transaction.amount,
    currency: transaction.currency,
    method_id: transaction.method_id,
    destination_address: transaction.destination_address,
    status: transaction.status,
    created_at: transaction.created_at,
    updated_at: transaction.updated_at,
    admin_notes: transaction.admin_notes,
    processed_at: transaction.processed_at,
    type: type
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('key');
  const action = searchParams.get('action');

  // Check admin key
  if (apiKey !== ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
  }

  try {
    switch (action) {
      case 'pending-deposits':
        const { data: deposits, error: depositsError } = await supabase
          .from('deposits')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (depositsError) {
          console.error('Deposits query error:', depositsError);
          return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 });
        }

        const formattedDeposits = (deposits || []).map(d => formatTransaction(d, 'deposit'));

        return NextResponse.json({
          success: true,
          data: formattedDeposits,
          count: formattedDeposits.length,
          message: `Found ${formattedDeposits.length} pending deposits`
        });

      case 'pending-withdrawals':
        const { data: withdrawals, error: withdrawalsError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (withdrawalsError) {
          console.error('Withdrawals query error:', withdrawalsError);
          return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
        }

        const formattedWithdrawals = (withdrawals || []).map(w => formatTransaction(w, 'withdrawal'));

        return NextResponse.json({
          success: true,
          data: formattedWithdrawals,
          count: formattedWithdrawals.length,
          message: `Found ${formattedWithdrawals.length} pending withdrawals`
        });

      case 'stats':
        const { data: pendingDeposits } = await supabase
          .from('deposits')
          .select('id', { count: 'exact' })
          .eq('status', 'pending');

        const { data: pendingWithdrawals } = await supabase
          .from('withdrawal_requests')
          .select('id', { count: 'exact' })
          .eq('status', 'pending');

        const { data: totalUsers } = await supabase
          .from('users')
          .select('id', { count: 'exact' });

        return NextResponse.json({
          success: true,
          stats: {
            pendingDeposits: pendingDeposits?.length || 0,
            pendingWithdrawals: pendingWithdrawals?.length || 0,
            totalUsers: totalUsers?.length || 0
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, action, transactionId, transactionType, status, adminNotes } = body;

  // Check admin key
  if (key !== ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
  }

  try {
    const timestamp = new Date().toISOString();

    if (action === 'update-transaction') {
      if (transactionType === 'deposit') {
        const { data, error } = await supabase
          .from('deposits')
          .update({
            status: status,
            admin_notes: adminNotes || `Updated via API at ${timestamp}`,
            processed_at: timestamp,
            updated_at: timestamp
          })
          .eq('id', transactionId)
          .select();

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Deposit ${status} successfully`,
          data: data?.[0]
        });

      } else if (transactionType === 'withdrawal') {
        const { data, error } = await supabase
          .from('withdrawal_requests')
          .update({
            status: status,
            admin_notes: adminNotes || `Updated via API at ${timestamp}`,
            processed_at: timestamp,
            updated_at: timestamp
          })
          .eq('id', transactionId)
          .select();

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Withdrawal ${status} successfully`,
          data: data?.[0]
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action or transaction type' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
