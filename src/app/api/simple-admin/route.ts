import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (action) {
      case 'list':
        const { data: withdrawals, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          action: 'list',
          count: withdrawals?.length || 0,
          withdrawals: withdrawals || []
        });

      case 'pending':
        const { data: pending, error: pendingError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (pendingError) throw pendingError;

        return NextResponse.json({
          success: true,
          action: 'pending',
          count: pending?.length || 0,
          withdrawals: pending || []
        });

      case 'stats':
        const { data: stats, error: statsError } = await supabase
          .rpc('get_withdrawal_stats');

        if (statsError) throw statsError;

        return NextResponse.json({
          success: true,
          action: 'stats',
          stats: stats || {}
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: list, pending, or stats'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Simple admin API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, withdrawalId, status, adminNotes } = body;

    switch (action) {
      case 'approve':
        if (!withdrawalId) {
          return NextResponse.json({
            success: false,
            error: 'withdrawalId is required'
          }, { status: 400 });
        }

        const { data: approved, error: approveError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'approved',
            admin_notes: adminNotes || 'Approved via simple admin interface',
            processed_by: 'admin@ticgloballtd.com',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawalId)
          .select();

        if (approveError) throw approveError;

        return NextResponse.json({
          success: true,
          action: 'approve',
          withdrawal: approved?.[0] || null,
          message: 'Withdrawal approved successfully'
        });

      case 'reject':
        if (!withdrawalId) {
          return NextResponse.json({
            success: false,
            error: 'withdrawalId is required'
          }, { status: 400 });
        }

        const { data: rejected, error: rejectError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'rejected',
            admin_notes: adminNotes || 'Rejected via simple admin interface',
            processed_by: 'admin@ticgloballtd.com',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawalId)
          .select();

        if (rejectError) throw rejectError;

        return NextResponse.json({
          success: true,
          action: 'reject',
          withdrawal: rejected?.[0] || null,
          message: 'Withdrawal rejected successfully'
        });

      case 'update_status':
        if (!withdrawalId || !status) {
          return NextResponse.json({
            success: false,
            error: 'withdrawalId and status are required'
          }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: status,
            admin_notes: adminNotes || `Status updated to ${status}`,
            processed_by: 'admin@ticgloballtd.com',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawalId)
          .select();

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          action: 'update_status',
          withdrawal: updated?.[0] || null,
          message: `Withdrawal status updated to ${status}`
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: approve, reject, or update_status'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Simple admin POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
