import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import NotificationService from '@/lib/services/notificationService';
import { requireAdmin } from '@/lib/admin-auth';

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

// GET - Get all withdrawal requests with filtering and pagination
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
    const method = searchParams.get('method') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userEmail = searchParams.get('userEmail');
    
    // Build query for withdrawal requests (without join for now)
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (method !== 'all') {
      query = query.eq('method_id', method);
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

    const { data: withdrawals, error } = await query;

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals', details: error.message },
        { status: 500 }
      );
    }

    // Get withdrawal statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_withdrawal_stats');

    if (statsError) {
      console.error('Error fetching withdrawal stats:', statsError);
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
      stats: stats || {
        total_withdrawals: 0,
        pending_withdrawals: 0,
        completed_withdrawals: 0,
        total_amount: 0,
        pending_amount: 0,
        withdrawals_today: 0
      },
      pagination: {
        limit,
        offset,
        hasMore: withdrawals?.length === limit
      }
    });

  } catch (error) {
    console.error('Error in admin withdrawals API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Bulk approve/reject withdrawals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { withdrawalIds, action, adminEmail, adminNotes, blockchainHashes } = body;

    if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return NextResponse.json(
        { error: 'Withdrawal IDs array is required' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject', 'complete'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve", "reject", or "complete"' },
        { status: 400 }
      );
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    // Use the same supabase instance defined at the top
    const results = [];

    for (let i = 0; i < withdrawalIds.length; i++) {
      const withdrawalId = withdrawalIds[i];
      const blockchainHash = blockchainHashes?.[i] || null;

      try {
        if (action === 'approve' || action === 'complete') {
          // Use database function to approve withdrawal
          const { error: approveError } = await supabase
            .rpc('approve_withdrawal', {
              withdrawal_id_param: withdrawalId,
              admin_email_param: adminEmail,
              blockchain_hash_param: blockchainHash,
              admin_notes_param: adminNotes || null
            });

          if (approveError) {
            console.error(`Error approving withdrawal ${withdrawalId}:`, approveError);
            results.push({ 
              withdrawal_id: withdrawalId, 
              success: false, 
              error: approveError.message 
            });
          } else {
            results.push({ 
              withdrawal_id: withdrawalId, 
              success: true, 
              action: 'completed',
              blockchain_hash: blockchainHash
            });
          }
        } else if (action === 'reject') {
          // Get withdrawal details for refund
          const { data: withdrawal, error: fetchError } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawalId)
            .single();

          if (fetchError || !withdrawal) {
            results.push({ 
              withdrawal_id: withdrawalId, 
              success: false, 
              error: 'Withdrawal not found' 
            });
            continue;
          }

          // Update withdrawal status to rejected
          const { error: updateError } = await supabase
            .from('withdrawal_requests')
            .update({
              status: 'failed',
              processed_by: adminEmail,
              processed_at: new Date().toISOString(),
              admin_notes: adminNotes || 'Rejected by admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', withdrawalId);

          if (updateError) {
            results.push({ 
              withdrawal_id: withdrawalId, 
              success: false, 
              error: updateError.message 
            });
            continue;
          }

          // Update related transaction
          await supabase
            .from('transactions')
            .update({
              status: 'rejected',
              approved_by: adminEmail,
              approved_at: new Date().toISOString(),
              admin_notes: adminNotes || 'Rejected by admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', withdrawal.transaction_id);

          // Refund the amount to user's wallet with unique transaction ID
          const refundTransactionId = `refund-${withdrawalId}-${Date.now()}`;
          await supabase
            .rpc('credit_user_wallet', {
              user_email_param: withdrawal.user_email,
              amount_param: withdrawal.amount,
              transaction_id_param: refundTransactionId,
              description_param: `Withdrawal rejection refund: $${withdrawal.amount}`
            });

          results.push({ 
            withdrawal_id: withdrawalId, 
            success: true, 
            action: 'rejected_and_refunded',
            refund_amount: withdrawal.amount
          });
        }
      } catch (error) {
        console.error(`Error processing withdrawal ${withdrawalId}:`, error);
        results.push({ 
          withdrawal_id: withdrawalId, 
          success: false, 
          error: 'Processing failed' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    // Create admin notification for bulk action
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'bulk_withdrawal_action',
          title: `Bulk Withdrawal ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          message: `${successCount} withdrawals ${action}d successfully, ${failureCount} failed by ${adminEmail}`,
          metadata: {
            action: action,
            success_count: successCount,
            failure_count: failureCount,
            admin_email: adminEmail,
            admin_notes: adminNotes,
            results: results
          },
          created_at: new Date().toISOString()
        });
    } catch (notificationError) {
      console.error('Failed to create admin notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed: ${successCount} successful, ${failureCount} failed`,
      results: results,
      summary: {
        total_processed: withdrawalIds.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Error in bulk withdrawal action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update individual withdrawal status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { withdrawalId, action, adminEmail, adminNotes, blockchainHash } = body;

    if (!withdrawalId || !action || !adminEmail) {
      return NextResponse.json(
        { error: 'Withdrawal ID, action, and admin email are required' },
        { status: 400 }
      );
    }

    const validActions = ['approve', 'reject', 'complete', 'processing'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Use the same supabase instance defined at the top

    if (action === 'approve' || action === 'complete') {
      // Use database function to approve withdrawal
      const { error: approveError } = await supabase
        .rpc('approve_withdrawal', {
          withdrawal_id_param: withdrawalId,
          admin_email_param: adminEmail,
          blockchain_hash_param: blockchainHash || null,
          admin_notes_param: adminNotes || null
        });

      if (approveError) {
        console.error('Error approving withdrawal:', approveError);
        return NextResponse.json(
          { error: approveError.message || 'Failed to approve withdrawal' },
          { status: 500 }
        );
      }

      // Get withdrawal details for notification
      const { data: withdrawal } = await supabase
        .from('withdrawal_requests')
        .select('user_email, amount, currency')
        .eq('id', withdrawalId)
        .single();

      // Create completion notification
      if (withdrawal?.user_email) {
        try {
          await NotificationService.createTransactionNotification(
            withdrawal.user_email,
            'withdrawal',
            withdrawal.amount || 0,
            withdrawal.currency || 'USD',
            withdrawalId
          );
        } catch (notificationError) {
          console.error('Error creating withdrawal completion notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Withdrawal completed successfully',
        action: 'completed',
        blockchain_hash: blockchainHash
      });
    } else {
      // Handle other actions (reject, processing)
      const statusMap = {
        'reject': 'failed',
        'processing': 'processing'
      };

      const newStatus = statusMap[action as keyof typeof statusMap];

      // Get withdrawal details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (fetchError || !withdrawal) {
        return NextResponse.json(
          { error: 'Withdrawal request not found' },
          { status: 404 }
        );
      }

      // Update withdrawal status
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: newStatus,
          processed_by: adminEmail,
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalId)
        .select()
        .single();

      if (error) {
        console.error('Error updating withdrawal:', error);
        return NextResponse.json(
          { error: 'Failed to update withdrawal' },
          { status: 500 }
        );
      }

      // Update related transaction
      await supabase
        .from('transactions')
        .update({
          status: action === 'reject' ? 'rejected' : 'processing',
          approved_by: adminEmail,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.transaction_id);

      // If rejecting, refund the amount
      if (action === 'reject') {
        const refundTransactionId = `refund-${withdrawalId}-${Date.now()}`;
        await supabase
          .rpc('credit_user_wallet', {
            user_email_param: withdrawal.user_email,
            amount_param: withdrawal.amount,
            transaction_id_param: refundTransactionId,
            description_param: `Withdrawal rejection refund: $${withdrawal.amount}`
          });

        // Create rejection notification
        try {
          await NotificationService.createNotification({
            user_email: withdrawal.user_email,
            title: 'Withdrawal Rejected',
            message: `Your withdrawal of $${(withdrawal.amount || 0).toFixed(2)} ${withdrawal.currency || 'USD'} was not approved. The amount has been refunded to your wallet. Please save your transaction ID for reference and contact support for assistance.`,
            type: 'withdrawal',
            priority: 'high',
            action_url: `/support-hub?transactionId=${withdrawalId}&issueType=withdrawal-rejected&amount=${withdrawal.amount || 0}`,
            metadata: {
              transaction_id: withdrawalId,
              amount: withdrawal.amount || 0,
              currency: withdrawal.currency || 'USD',
              status: 'rejected',
              admin_notes: adminNotes,
              refunded: true,
              timestamp: new Date().toISOString()
            }
          });
        } catch (notificationError) {
          console.error('Error creating withdrawal rejection notification:', notificationError);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Withdrawal ${action}ed successfully${action === 'reject' ? ' and amount refunded' : ''}`,
        withdrawal: data,
        refunded: action === 'reject' ? withdrawal.amount : null
      });
    }

  } catch (error) {
    console.error('Error updating withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
