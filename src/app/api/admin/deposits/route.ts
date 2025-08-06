import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DepositService } from '@/lib/services/depositService';
import { requireAdmin } from '@/lib/admin-auth';

// GET - Get all deposit transactions with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const network = searchParams.get('network') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userEmail = searchParams.get('userEmail');

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

    // Build query for deposits table
    let query = supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (network !== 'all') {
      query = query.eq('network', network);
    }

    if (userEmail) {
      query = query.ilike('user_email', `%${userEmail}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching deposits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deposits' },
        { status: 500 }
      );
    }

    // Get deposit statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_deposit_stats');

    if (statsError) {
      console.error('Error fetching deposit stats:', statsError);
    }

    return NextResponse.json({
      success: true,
      deposits: deposits || [],
      stats: stats || {
        total_deposits: 0,
        pending_deposits: 0,
        approved_deposits: 0,
        total_amount: 0,
        pending_amount: 0,
        deposits_today: 0
      },
      pagination: {
        limit,
        offset,
        hasMore: deposits?.length === limit
      }
    });

  } catch (error) {
    console.error('Error in admin deposits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Bulk approve/reject deposits
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositIds, action, adminEmail, adminNotes } = body;

    if (!depositIds || !Array.isArray(depositIds) || depositIds.length === 0) {
      return NextResponse.json(
        { error: 'Deposit IDs array is required' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    const depositService = DepositService.getInstance();
    const status = action === 'approve' ? 'completed' : 'rejected';

    // Update multiple deposits using DepositService
    const results = [];
    const errors = [];

    for (const depositId of depositIds) {
      try {
        const updatedDeposit = await depositService.updateDepositStatus(
          depositId,
          status,
          adminEmail,
          adminNotes
        );

        results.push({
          id: updatedDeposit.id,
          status: updatedDeposit.status,
          user_email: updatedDeposit.user_email,
          amount: updatedDeposit.final_amount,
          success: true
        });

      } catch (error: any) {
        console.error(`Error updating deposit ${depositId}:`, error);
        errors.push({
          id: depositId,
          error: error.message || 'Update failed'
        });
      }
    }

    // Create admin notifications for bulk action
    try {
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

      await supabase
        .from('admin_notifications')
        .insert({
          type: 'bulk_deposit_action',
          title: `Bulk Deposit ${action === 'approve' ? 'Approval' : 'Rejection'}`,
          message: `${results.length} deposits were ${action === 'approve' ? 'approved' : 'rejected'} by ${adminEmail}`,
          metadata: {
            action: action,
            transaction_count: results.length,
            admin_email: adminEmail,
            admin_notes: adminNotes,
            errors: errors.length > 0 ? errors : undefined
          },
          created_at: new Date().toISOString()
        });
    } catch (notificationError) {
      console.error('Failed to create admin notification:', notificationError);
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${results.length} deposits ${action === 'approve' ? 'approved' : 'rejected'} successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      updatedCount: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in bulk deposit action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update individual deposit status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, status, adminEmail, adminNotes, transactionHash } = body;

    if (!transactionId || !status || !adminEmail) {
      return NextResponse.json(
        { error: 'Transaction ID, status, and admin email are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

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
    
    // Update transaction
    const updateData: any = {
      status: status,
      admin_notes: adminNotes || null,
      approved_by: adminEmail,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add transaction hash if provided (for completed deposits)
    if (transactionHash && status === 'completed') {
      updateData.transaction_hash = transactionHash;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .eq('transaction_type', 'deposit')
      .select()
      .single();

    if (error) {
      console.error('Error updating deposit:', error);
      return NextResponse.json(
        { error: 'Failed to update deposit' },
        { status: 500 }
      );
    }

    // If approving or completing deposit, credit user wallet (with duplicate check)
    if ((status === 'approved' || status === 'completed') && data) {
      try {
        // Check if this deposit has already been credited to prevent duplicates
        const { data: existingTransaction } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('transaction_id', data.id)
          .eq('transaction_type', 'deposit')
          .single();

        if (existingTransaction) {
          console.log(`⚠️ Deposit ${data.id} already credited to wallet, skipping duplicate credit`);
        } else {
          const { error: creditError } = await supabase
            .rpc('credit_user_wallet', {
              user_email_param: data.user_email,
              amount_param: data.final_amount || data.amount,
              transaction_id_param: data.id,
              description_param: `Deposit ${status}: $${data.amount} ${data.network}${transactionHash ? ` (Hash: ${transactionHash})` : ''}`
            });

          if (creditError) {
            console.error(`Error crediting wallet for ${data.user_email}:`, creditError);
            // Don't fail the transaction update if wallet credit fails
            // Log the error for manual resolution
          }
        }
      } catch (creditError) {
        console.error(`Error crediting wallet for ${data.user_email}:`, creditError);
      }
    }

    // Create admin notification
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'deposit_status_update',
          title: `Deposit ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Deposit of $${data.amount} from ${data.user_email} was ${status} by ${adminEmail}`,
          metadata: {
            transaction_id: transactionId,
            old_status: 'pending',
            new_status: status,
            admin_email: adminEmail,
            admin_notes: adminNotes,
            transaction_hash: transactionHash
          },
          created_at: new Date().toISOString()
        });
    } catch (notificationError) {
      console.error('Failed to create admin notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: `Deposit ${status} successfully`,
      transaction: data
    });

  } catch (error) {
    console.error('Error updating deposit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete deposit transaction (admin only, for spam/invalid deposits)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const adminEmail = searchParams.get('adminEmail');
    const reason = searchParams.get('reason');

    if (!transactionId || !adminEmail) {
      return NextResponse.json(
        { error: 'Transaction ID and admin email are required' },
        { status: 400 }
      );
    }

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

    // Get deposit details before deletion
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // Delete deposit
    const { error: deleteError } = await supabase
      .from('deposits')
      .delete()
      .eq('id', transactionId);

    if (deleteError) {
      console.error('Error deleting deposit:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete deposit' },
        { status: 500 }
      );
    }

    // Create admin notification for deletion
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'deposit_deleted',
          title: 'Deposit Transaction Deleted',
          message: `Deposit of $${deposit.amount} from ${deposit.user_email} was deleted by ${adminEmail}`,
          metadata: {
            deleted_deposit: deposit,
            admin_email: adminEmail,
            deletion_reason: reason || 'No reason provided'
          },
          created_at: new Date().toISOString()
        });
    } catch (notificationError) {
      console.error('Failed to create deletion notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit transaction deleted successfully',
      deletedDeposit: deposit
    });

  } catch (error) {
    console.error('Error deleting deposit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
