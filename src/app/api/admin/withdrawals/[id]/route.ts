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

// PATCH - Update withdrawal status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const { action, admin_notes, transaction_hash } = await request.json();
    const withdrawalId = params.id;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // First, get the withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', withdrawalId)
      .eq('type', 'withdrawal')
      .single();

    if (fetchError || !withdrawal) {
      console.error('Error fetching withdrawal:', fetchError);
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: action === 'approve' ? 'completed' : 'rejected',
      updated_at: new Date().toISOString(),
      admin_notes: admin_notes || null
    };

    if (action === 'approve' && transaction_hash) {
      updateData.transaction_hash = transaction_hash;
    }

    // Update the withdrawal status
    const { error: updateError } = await supabase
      .from('wallet_transactions')
      .update(updateData)
      .eq('id', withdrawalId);

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
      return NextResponse.json(
        { error: 'Failed to update withdrawal status' },
        { status: 500 }
      );
    }

    // If withdrawal is rejected, refund the amount to user's wallet
    if (action === 'reject') {
      try {
        // Get current user wallet balance
        const { data: userWallet, error: walletError } = await supabase
          .from('user_wallets')
          .select('total_balance')
          .eq('user_email', withdrawal.user_email)
          .single();

        if (walletError) {
          console.error('Error fetching user wallet:', walletError);
        } else {
          // Refund the amount
          const newBalance = (userWallet.total_balance || 0) + withdrawal.amount;
          
          const { error: refundError } = await supabase
            .from('user_wallets')
            .update({ 
              total_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_email', withdrawal.user_email);

          if (refundError) {
            console.error('Error refunding withdrawal:', refundError);
          } else {
            // Create a refund transaction record
            await supabase
              .from('wallet_transactions')
              .insert({
                user_email: withdrawal.user_email,
                type: 'refund',
                amount: withdrawal.amount,
                status: 'completed',
                description: `Refund for rejected withdrawal #${withdrawalId.slice(0, 8)}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          }
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
      }
    }

    // Send notification to user
    try {
      const notificationTitle = action === 'approve' 
        ? 'Withdrawal Approved' 
        : 'Withdrawal Rejected';
      
      const notificationMessage = action === 'approve'
        ? `Your withdrawal of $${withdrawal.amount.toLocaleString()} has been approved and processed.`
        : `Your withdrawal of $${withdrawal.amount.toLocaleString()} has been rejected. ${admin_notes ? `Reason: ${admin_notes}` : ''}`;

      await NotificationService.createNotification({
        user_email: withdrawal.user_email,
        title: notificationTitle,
        message: notificationMessage,
        type: 'withdrawal',
        priority: action === 'approve' ? 'medium' : 'high'
      });
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${action}d successfully`,
      withdrawal: {
        id: withdrawalId,
        status: updateData.status,
        admin_notes: updateData.admin_notes,
        updated_at: updateData.updated_at
      }
    });

  } catch (error) {
    console.error('Error in admin withdrawal update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get specific withdrawal details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const withdrawalId = params.id;

    const { data: withdrawal, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', withdrawalId)
      .eq('type', 'withdrawal')
      .single();

    if (error || !withdrawal) {
      console.error('Error fetching withdrawal:', error);
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal
    });

  } catch (error) {
    console.error('Error in admin withdrawal fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
