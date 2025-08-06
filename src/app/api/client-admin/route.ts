import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple authentication check
function isValidAdminRequest(request: NextRequest): boolean {
  // You can add additional security checks here
  // For now, we'll rely on the frontend password check
  return true;
}

export async function GET(request: NextRequest) {
  try {
    if (!isValidAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'withdrawals' or 'deposits'
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (type === 'withdrawals') {
      const { data: withdrawals, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: withdrawals || [],
        count: withdrawals?.length || 0
      });

    } else if (type === 'deposits') {
      const { data: deposits, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: deposits || [],
        count: deposits?.length || 0
      });

    } else {
      return NextResponse.json({
        error: 'Invalid type. Use "withdrawals" or "deposits"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Client admin GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isValidAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, transactionId, transactionType, adminNotes } = body;

    if (!action || !transactionId || !transactionType) {
      return NextResponse.json({
        error: 'Missing required fields: action, transactionId, transactionType'
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const processedBy = 'client-admin';

    if (transactionType === 'withdrawal') {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes || `${action}d via client admin panel`,
          processed_by: processedBy,
          processed_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', transactionId)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Withdrawal ${action}d successfully`,
        data: data?.[0] || null
      });

    } else if (transactionType === 'deposit') {
      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes || `${action}d via client admin panel`,
          processed_by: processedBy,
          processed_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', transactionId)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Deposit ${action}d successfully`,
        data: data?.[0] || null
      });

    } else {
      return NextResponse.json({
        error: 'Invalid transaction type. Use "withdrawal" or "deposit"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Client admin POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Additional endpoint for statistics
export async function PUT(request: NextRequest) {
  try {
    if (!isValidAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get withdrawal stats
    const { data: withdrawalStats, error: withdrawalError } = await supabase
      .rpc('get_withdrawal_stats');

    // Get deposit stats  
    const { data: depositStats, error: depositError } = await supabase
      .rpc('get_deposit_stats');

    return NextResponse.json({
      success: true,
      stats: {
        withdrawals: withdrawalStats || {},
        deposits: depositStats || {},
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Client admin stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
